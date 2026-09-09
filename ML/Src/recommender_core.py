from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import pandas as pd
from dotenv import load_dotenv

try:
    from supabase import ClientOptions, create_client
except ImportError:  # pragma: no cover
    ClientOptions = None
    create_client = None


def load_environment() -> None:
    """Load the project environment from .env or .env.local."""
    candidates = [
        Path(__file__).resolve().parents[1] / ".env",
        Path(__file__).resolve().parents[1] / ".env.local",
        Path.cwd() / ".env",
        Path.cwd() / ".env.local",
        Path(__file__).resolve().parents[2] / ".env",
        Path(__file__).resolve().parents[2] / ".env.local",
    ]
    for candidate in candidates:
        if candidate.exists():
            load_dotenv(candidate, override=False)


def normalize_recommender_dataframe(df: Optional[pd.DataFrame]) -> pd.DataFrame:
    if df is None or df.empty:
        return pd.DataFrame()
    df = df.copy()

    rename_map = {
        "product_id": "item_id",
        "productId": "item_id",
        "itemid": "item_id",
        "title": "name",
        "product_name": "name",
        "categoryName": "category",
        "category_name": "category",
        "sub_cat": "category",
        "brand": "brand",
        "tags": "tags",
        "description": "description",
    }
    df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})

    if "item_id" not in df.columns:
        raise ValueError("The recommender dataframe must contain a product/item identifier column.")

    if "user_id" not in df.columns and "profile_id" in df.columns:
        df = df.rename(columns={"profile_id": "user_id"})
    if "user_id" not in df.columns:
        df["user_id"] = ""

    if "rating" not in df.columns:
        if "value" in df.columns:
            df = df.rename(columns={"value": "rating"})
        elif "score" in df.columns:
            df = df.rename(columns={"score": "rating"})
        else:
            df["rating"] = 1.0

    if "name" not in df.columns:
        df["name"] = ""
    if "description" not in df.columns:
        df["description"] = ""
    if "category" not in df.columns:
        df["category"] = ""
    if "tags" not in df.columns:
        df["tags"] = ""
    if "brand" not in df.columns:
        df["brand"] = ""

    df["name"] = df["name"].fillna("")
    df["description"] = df["description"].fillna("")
    df["category"] = df["category"].fillna("")
    df["tags"] = df["tags"].fillna("")
    df["brand"] = df["brand"].fillna("")
    df["user_id"] = df["user_id"].fillna("").astype(str)
    df["item_id"] = df["item_id"].astype(str)

    return df


def get_supabase_client():
    load_environment()
    url = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    key = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not url or not key:
        raise RuntimeError(
            "Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY "
            "or SUPABASE_URL and SUPABASE_ANON_KEY in .env/.env.local."
        )
    if create_client is None:
        raise RuntimeError("The supabase Python package is not installed. Run: python -m pip install -r ML/requirements.txt")
    options = ClientOptions(postgrest_client_timeout=30) if ClientOptions is not None else None
    client = create_client(url, key, options=options)
    return client


def fetch_project_data(limit_products: Optional[int] = None, include_orders: bool = True) -> pd.DataFrame:
    client = get_supabase_client()
    products_res = client.table("products").select(
        "id, name, description, category_id, tags, stock, category:categories(name)"
    ).order("id", desc=False).execute()
    products = products_res.data or []

    product_rows: List[Dict[str, Any]] = []
    for row in products:
        category_name = row.get("category")
        if isinstance(category_name, dict):
            category_name = category_name.get("name")
        product_rows.append({
            "item_id": row.get("id"),
            "name": row.get("name") or "",
            "description": row.get("description") or "",
            "category": category_name or "",
            "tags": row.get("tags") or [],
            "stock": row.get("stock") or 0,
        })

    if limit_products is not None:
        product_rows = product_rows[:limit_products]

    interaction_rows: List[Dict[str, Any]] = []

    favorites = client.table("favorites").select("user_id, product_id").execute().data or []
    for row in favorites:
        interaction_rows.append({"user_id": row.get("user_id"), "item_id": row.get("product_id"), "rating": 5.0})

    interactions = client.table("interactions").select("user_id, product_id, type, value").execute().data or []
    for row in interactions:
        interaction_rows.append({
            "user_id": row.get("user_id"),
            "item_id": row.get("product_id"),
            "rating": (row.get("value") if row.get("value") is not None else 1.0),
            "type": row.get("type"),
        })

    if include_orders:
        orders = client.table("orders").select("id, user_id, status, order_items(product_id, quantity)").execute().data or []
        for order in orders:
            if not order.get("user_id"):
                continue
            items = order.get("order_items") or []
            for item in items:
                product_id = item.get("product_id")
                qty = item.get("quantity") or 0
                if product_id is None:
                    continue
                status = (order.get("status") or "").lower()
                weight = 4.0 if status in {"delivered", "shipped", "paid"} else 1.0
                interaction_rows.append({
                    "user_id": order.get("user_id"),
                    "item_id": product_id,
                    "rating": float(qty) * weight,
                    "type": "purchase",
                })

    df = pd.DataFrame(interaction_rows)
    if df.empty:
        products_df = pd.DataFrame(product_rows)
        products_df = normalize_recommender_dataframe(products_df)
        return products_df

    df = normalize_recommender_dataframe(df)

    products_df = pd.DataFrame(product_rows)
    products_df = normalize_recommender_dataframe(products_df)
    product_ids = set(products_df["item_id"].astype(str).tolist())
    df = df[df["item_id"].astype(str).isin(product_ids)].copy()

    if "type" not in df.columns:
        df["type"] = "interaction"

    return df.merge(products_df[["item_id", "name", "description", "category", "tags"]], on="item_id", how="left")


__all__ = [
    "fetch_project_data",
    "get_supabase_client",
    "load_environment",
    "normalize_recommender_dataframe",
]
