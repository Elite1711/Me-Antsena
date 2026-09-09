from __future__ import annotations

import argparse

from .collaborative_filtering import CollaborativeFilteringRecommender
from .content_based import ContentBasedRecommender
from .hybrid_model import HybridRecommender
from .popularity_based import PopularityBasedRecommender
from .recommender_core import fetch_project_data


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Me-Antsena recommendation pipeline.")
    parser.add_argument("--user-id", default=None, help="Optional user ID to generate recommendations for.")
    parser.add_argument("--top-n", type=int, default=5, help="Number of recommendations to return.")
    args = parser.parse_args()

    try:
        df = fetch_project_data()
    except Exception as exc:  # pragma: no cover
        print(f"ML init failed: {exc}")
        return

    if df.empty:
        print("No interaction or product data available from Supabase.")
        return

    popularity = PopularityBasedRecommender(df)
    content = ContentBasedRecommender(df)
    collaborative = CollaborativeFilteringRecommender(df)
    hybrid = HybridRecommender(df)

    if args.user_id:
        user_id = str(args.user_id)
        if "user_id" in df.columns and not df["user_id"].fillna("").eq("").all():
            print(f"\nRecommendations for user={user_id}\n")
            print("Popularity:", popularity.get_most_popular_items(top_n=args.top_n).to_dict("records"))
            print("Content-based:", content.get_recommendations(user_id, top_n=args.top_n))
            print("Collaborative:", collaborative.get_recommendations(user_id, top_n=args.top_n))
            print("Hybrid:", hybrid.get_recommendations(user_id, top_n=args.top_n))
            return
        print(f"No user interactions found for this project; recommendations are empty for user {user_id}.")
        return

    print("Loaded recommendation data:")
    print(f"- rows: {len(df)}")
    print(f"- users: {df['user_id'].nunique() if 'user_id' in df.columns else 0}")
    print(f"- products: {df['item_id'].nunique() if 'item_id' in df.columns else 0}")


if __name__ == "__main__":
    main()
