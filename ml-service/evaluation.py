"""Chronological offline evaluation for the recommendation strategies."""

from datetime import date, datetime, timezone
from typing import Dict, List, Tuple

import numpy as np

from data import (
    INTERACTION_WEIGHTS,
    build_interaction_matrix,
    fetch_interactions,
    fetch_products,
    get_supabase_client,
)
from models import CollaborativeFilteringModel, ContentBasedModel, HybridRecommender

RELEVANT_TYPES = ("favorite", "add_to_cart", "purchase")
METHOD_NAMES = ("popularity", "collaborative", "content", "hybrid")
MIN_VALIDATION_USERS_FOR_TUNING = 5


def _parse_interaction_time(interaction: dict) -> datetime:
    value = interaction.get("created_at")
    if not isinstance(value, str) or not value:
        raise ValueError(
            "L'évaluation temporelle exige un champ created_at valide pour chaque interaction."
        )
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"Date d'interaction invalide dans created_at: {value!r}.") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def chronological_train_validation_test_split(
    interactions: List[dict], test_ratio: float = 0.2
) -> Tuple[List[dict], List[dict], List[dict], dict]:
    """Split each eligible user's UTC-day groups into train, validation and test."""
    if not 0.0 < test_ratio < 0.9:
        raise ValueError("test_ratio doit être compris entre 0 et 0.9.")
    if len(interactions) < 2:
        raise ValueError("Pas assez d'interactions pour créer un split temporel.")

    by_user: Dict[str, List[Tuple[date, dict]]] = {}
    for interaction in interactions:
        interaction_day = _parse_interaction_time(interaction).date()
        user_id = interaction.get("user_id")
        if user_id is None:
            continue
        by_user.setdefault(str(user_id), []).append(
            (interaction_day, interaction)
        )

    train: List[dict] = []
    validation: List[dict] = []
    test: List[dict] = []
    validation_cutoffs: List[date] = []
    test_cutoffs: List[date] = []
    eligible_users = 0
    for user_interactions in by_user.values():
        user_interactions.sort(key=lambda row: row[0])
        active_days = sorted({interaction_day for interaction_day, _ in user_interactions})
        if len(active_days) < 3:
            train.extend(interaction for _, interaction in user_interactions)
            continue

        holdout_groups = max(1, int(len(active_days) * test_ratio))
        holdout_groups = min(holdout_groups, (len(active_days) - 1) // 2)
        if holdout_groups < 1:
            train.extend(interaction for _, interaction in user_interactions)
            continue

        validation_start = len(active_days) - 2 * holdout_groups
        test_start = len(active_days) - holdout_groups
        train_cutoff = active_days[validation_start]
        test_cutoff = active_days[test_start]
        user_train = [it for day, it in user_interactions if day < train_cutoff]
        user_validation = [
            it
            for day, it in user_interactions
            if train_cutoff <= day < test_cutoff
        ]
        user_test = [it for day, it in user_interactions if day >= test_cutoff]
        if not user_train or not user_validation or not user_test:
            train.extend(interaction for _, interaction in user_interactions)
            continue

        train.extend(user_train)
        validation.extend(user_validation)
        test.extend(user_test)
        validation_cutoffs.append(train_cutoff)
        test_cutoffs.append(test_cutoff)
        eligible_users += 1

    if not train or not validation or not test:
        raise ValueError(
            "Impossible de créer les trois périodes temporelles. Il faut des utilisateurs "
            "avec au moins trois horodatages distincts et des interactions pertinentes "
            "dans les périodes de validation et de test."
        )
    return train, validation, test, {
        "n_users_with_three_periods": eligible_users,
        "validation_timestamp": max(validation_cutoffs).isoformat(),
        "test_timestamp": max(test_cutoffs).isoformat(),
    }


def chronological_train_test_split(
    interactions: List[dict], test_ratio: float = 0.2
) -> Tuple[List[dict], List[dict], str]:
    """Compatibility helper returning the train + validation period as train."""
    train, validation, test, metadata = chronological_train_validation_test_split(
        interactions, test_ratio
    )
    return train + validation, test, metadata["test_timestamp"]


def _product_id(interaction: dict) -> int | None:
    try:
        return int(interaction["product_id"])
    except (KeyError, TypeError, ValueError):
        return None


def _seen_items_by_user(train_interactions: List[dict]) -> Dict[str, set[int]]:
    seen: Dict[str, set[int]] = {}
    for interaction in train_interactions:
        user_id = interaction.get("user_id")
        product_id = _product_id(interaction)
        if user_id is not None and product_id is not None:
            seen.setdefault(str(user_id), set()).add(product_id)
    return seen


def _relevant_items_by_user(
    test_interactions: List[dict], seen_by_user: Dict[str, set[int]], candidate_ids: set[int]
) -> Tuple[Dict[str, set[int]], int]:
    relevant: Dict[str, set[int]] = {}
    excluded = 0
    for interaction in test_interactions:
        if (interaction.get("type") or "").lower() not in RELEVANT_TYPES:
            continue
        user_id = interaction.get("user_id")
        product_id = _product_id(interaction)
        if user_id is None or product_id is None:
            continue
        uid = str(user_id)
        if (
            uid not in seen_by_user
            or product_id in seen_by_user[uid]
            or product_id not in candidate_ids
        ):
            excluded += 1
            continue
        relevant.setdefault(uid, set()).add(product_id)
    return relevant, excluded


def _ranking_metrics(
    ranked_ids: List[int], relevant_ids: set[int], k: int
) -> Tuple[float, float, float]:
    top_ids = ranked_ids[:k]
    hits = len(set(top_ids) & relevant_ids)
    precision = hits / k
    recall = hits / len(relevant_ids) if relevant_ids else 0.0

    dcg = sum(
        1.0 / np.log2(rank + 2)
        for rank, product_id in enumerate(top_ids)
        if product_id in relevant_ids
    )
    ideal_hits = min(len(relevant_ids), k)
    idcg = sum(1.0 / np.log2(rank + 2) for rank in range(ideal_hits))
    ndcg = float(dcg / idcg) if idcg else 0.0
    return precision, recall, ndcg


def _aggregate_rankings(
    rankings: Dict[str, Dict[str, List[int]]],
    relevant_by_user: Dict[str, set[int]],
    k: int,
) -> Dict[str, dict]:
    results = {}
    for method in METHOD_NAMES:
        user_metrics = [
            _ranking_metrics(rankings[method].get(user_id, []), relevant, k)
            for user_id, relevant in relevant_by_user.items()
        ]
        if user_metrics:
            means = np.mean(user_metrics, axis=0)
            results[method] = {
                "precision_at_k": round(float(means[0]), 4),
                "recall_at_k": round(float(means[1]), 4),
                "ndcg_at_k": round(float(means[2]), 4),
            }
        else:
            results[method] = {
                "precision_at_k": 0.0,
                "recall_at_k": 0.0,
                "ndcg_at_k": 0.0,
            }
    return results


def rmse(
    cf: CollaborativeFilteringModel,
    test_interactions: List[dict],
    seen_by_user: Dict[str, set[int]] | None = None,
) -> Tuple[float, int]:
    """RMSE on held-out user-item pairs that exist in the training vocabulary."""
    squared_errors: List[float] = []
    seen_by_user = seen_by_user or {}
    for interaction in test_interactions:
        uid = str(interaction.get("user_id"))
        product_id = _product_id(interaction)
        interaction_type = (interaction.get("type") or "view").lower()
        if product_id is None or product_id in seen_by_user.get(uid, set()):
            continue
        if (
            cf.user_embeddings is None
            or uid not in cf.user_index
            or product_id not in cf.item_index
        ):
            continue

        user_idx = cf.user_index[uid]
        item_idx = cf.item_index[product_id]
        predicted = float(np.dot(cf.user_embeddings[user_idx], cf.item_embeddings[item_idx]))
        actual = INTERACTION_WEIGHTS.get(interaction_type, 1.0)
        squared_errors.append((predicted - actual) ** 2)

    if not squared_errors:
        return 0.0, 0
    return float(np.sqrt(np.mean(squared_errors))), len(squared_errors)


def _rankings_for_period(
    collaborative: CollaborativeFilteringModel,
    content: ContentBasedModel,
    train_interactions: List[dict],
    target_interactions: List[dict],
    popularity_order: List[int],
    candidate_ids: set[int],
    k: int,
    cf_weight: float,
    cb_weight: float,
) -> Tuple[Dict[str, Dict[str, List[int]]], Dict[str, set[int]], int]:
    seen_by_user = _seen_items_by_user(train_interactions)
    relevant_by_user, excluded = _relevant_items_by_user(
        target_interactions, seen_by_user, candidate_ids
    )
    train_items_by_user: Dict[str, List[int]] = {}
    for interaction in train_interactions:
        user_id = interaction.get("user_id")
        product_id = _product_id(interaction)
        if user_id is not None and product_id is not None:
            user_items = train_items_by_user.setdefault(str(user_id), [])
            if product_id not in user_items:
                user_items.append(product_id)

    rankings: Dict[str, Dict[str, List[int]]] = {
        method: {} for method in METHOD_NAMES
    }
    hybrid = HybridRecommender(cf_weight=cf_weight, cb_weight=cb_weight)
    for user_id in relevant_by_user:
        seen = seen_by_user.get(user_id, set())
        collaborative_scores = collaborative.predict(
            user_id,
            top_k=k * 2,
            exclude_item_ids=seen,
            cold_start_fallback=False,
        )
        content_scores = content.recommend_from_history(
            train_items_by_user.get(user_id, []),
            top_k=k,
            exclude_product_ids=seen,
        )
        popular = [product_id for product_id in popularity_order if product_id not in seen]

        rankings["popularity"][user_id] = popular[:k]
        rankings["collaborative"][user_id] = [
            product_id for product_id, _ in collaborative_scores[:k]
        ]
        rankings["content"][user_id] = [
            product_id for product_id, _ in content_scores[:k]
        ]
        rankings["hybrid"][user_id] = [
            product_id
            for product_id, _ in hybrid.recommend(
                collaborative_scores, content_scores, top_k=k
            )
        ]
    return rankings, relevant_by_user, excluded


def run_evaluation(
    k: int = 10,
    test_ratio: float = 0.2,
    epochs: int = 20,
    seed: int = 42,
) -> dict:
    """Evaluate the recommendation strategies on platform interactions only."""
    supabase = get_supabase_client()
    products = fetch_products(supabase)
    interactions = fetch_interactions(supabase)
    if not products:
        raise ValueError("Le catalogue produits est vide; impossible d'évaluer le contenu.")

    train_interactions, validation_interactions, test_interactions, split_metadata = (
        chronological_train_validation_test_split(interactions, test_ratio=test_ratio)
    )
    matrix, user_ids, item_ids = build_interaction_matrix(train_interactions)
    if matrix.size == 0:
        raise ValueError("Pas assez d'interactions valides avant la coupure temporelle.")

    collaborative = CollaborativeFilteringModel()
    collaborative.fit(
        matrix,
        user_ids,
        item_ids,
        epochs=epochs,
        random_state=seed,
    )
    content = ContentBasedModel()
    content.fit(products)

    candidate_ids = {int(product["id"]) for product in products}
    popularity_scores = matrix.sum(axis=0)
    popularity_order = [
        item_ids[index] for index in np.argsort(popularity_scores)[::-1]
    ]
    candidate_ids = {int(product["id"]) for product in products}
    weight_grid = ((0.0, 1.0), (0.25, 0.75), (0.5, 0.5), (0.75, 0.25), (1.0, 0.0))

    validation_results = []
    for cf_weight, cb_weight in weight_grid:
        validation_rankings, validation_relevant, validation_excluded = _rankings_for_period(
            collaborative,
            content,
            train_interactions,
            validation_interactions,
            popularity_order,
            candidate_ids,
            k,
            cf_weight,
            cb_weight,
        )
        validation_metrics = _aggregate_rankings(
            validation_rankings, validation_relevant, k
        )
        validation_results.append(
            {
                "cf_weight": cf_weight,
                "cb_weight": cb_weight,
                "metrics": validation_metrics,
                "n_users_evaluated": len(validation_relevant),
                "n_relevant_items_evaluated": sum(
                    len(items) for items in validation_relevant.values()
                ),
                "n_relevant_items_excluded": validation_excluded,
            }
        )

    if not validation_results:
        raise ValueError("Aucun candidat de poids hybride n'a pu être évalué.")
    best_validation_result = max(
        validation_results,
        key=lambda result: (
            result["metrics"]["hybrid"]["ndcg_at_k"],
            result["metrics"]["hybrid"]["recall_at_k"],
            result["metrics"]["hybrid"]["precision_at_k"],
        ),
    )
    tuning_status = "selected"
    selected = best_validation_result
    if best_validation_result["n_users_evaluated"] == 0:
        tuning_status = "no_validation_relevant_users"
        selected = None
    elif best_validation_result["n_users_evaluated"] < MIN_VALIDATION_USERS_FOR_TUNING:
        tuning_status = "insufficient_validation_users"
        selected = None
    elif best_validation_result["metrics"]["hybrid"]["ndcg_at_k"] <= 0:
        tuning_status = "no_validation_hits"
        selected = None

    effective_cf_weight = selected["cf_weight"] if selected else 0.55
    effective_cb_weight = selected["cb_weight"] if selected else 0.45

    test_rankings, test_relevant, test_excluded = _rankings_for_period(
        collaborative,
        content,
        train_interactions,
        test_interactions,
        popularity_order,
        candidate_ids,
        k,
        effective_cf_weight,
        effective_cb_weight,
    )
    metrics = _aggregate_rankings(test_rankings, test_relevant, k)
    collaborative_metrics = metrics["collaborative"]
    rmse_value, evaluated_pairs = rmse(
        collaborative,
        test_interactions,
        _seen_items_by_user(train_interactions),
    )
    return {
        "protocol": "per_user_train_validation_test_v3",
        "split_strategy": "latest_utc_day_groups_per_user",
        "k": k,
        "test_ratio": test_ratio,
        "actual_validation_ratio": round(
            len(validation_interactions) / len(interactions), 4
        ),
        "actual_test_ratio": round(len(test_interactions) / len(interactions), 4),
        **split_metadata,
        "n_train_interactions": len(train_interactions),
        "n_validation_interactions": len(validation_interactions),
        "n_test_interactions": len(test_interactions),
        "n_users_evaluated_precision_recall": len(test_relevant),
        "n_relevant_items_evaluated": sum(
            len(items) for items in test_relevant.values()
        ),
        "n_relevant_items_excluded": test_excluded,
        "methods": metrics,
        "tuning": {
            "selection_metric": "validation_hybrid_ndcg_at_k",
            "status": tuning_status,
            "minimum_users_required": MIN_VALIDATION_USERS_FOR_TUNING,
            "candidate_weights": [
                {"cf_weight": cf_weight, "cb_weight": cb_weight}
                for cf_weight, cb_weight in weight_grid
            ],
            "candidate_results": validation_results,
            "selected_cf_weight": selected["cf_weight"] if selected else None,
            "selected_cb_weight": selected["cb_weight"] if selected else None,
            "validation_metrics": selected["metrics"] if selected else None,
            "n_users_evaluated": best_validation_result["n_users_evaluated"],
            "n_relevant_items_evaluated": best_validation_result[
                "n_relevant_items_evaluated"
            ],
            "n_relevant_items_excluded": best_validation_result[
                "n_relevant_items_excluded"
            ],
            "test_weights_used": {
                "cf_weight": effective_cf_weight,
                "cb_weight": effective_cb_weight,
                "source": "validation" if selected else "default_fallback",
            },
        },
        # Keep the original top-level collaborative metrics for API compatibility.
        **collaborative_metrics,
        "rmse": round(rmse_value, 4),
        "n_pairs_evaluated_rmse": evaluated_pairs,
    }
