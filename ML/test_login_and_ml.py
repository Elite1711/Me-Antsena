from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import ClientOptions, create_client

from Src.content_based import ContentBasedRecommender
from Src.collaborative_filtering import CollaborativeFilteringRecommender
from Src.hybrid_model import HybridRecommender
from Src.popularity_based import PopularityBasedRecommender
from Src.recommender_core import fetch_project_data, load_environment


def main() -> None:
    load_environment()
    supabase_url = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        print("AUTH_SKIPPED: missing Supabase credentials (set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or .env.local)")
        return

    client = create_client(supabase_url, supabase_key, options=ClientOptions(postgrest_client_timeout=30))
    auth = client.auth
    try:
        session = auth.get_session()
        if session and session.session:
            print("AUTH_OK: Supabase session available")
        else:
            print("AUTH_WARN: no active session; public reads still possible")
    except Exception as exc:  # pragma: no cover
        print(f"AUTH_FAIL: {exc}")
        return

    try:
        df = fetch_project_data()
        if df.empty:
            print("ML_WARN: no product/interaction data found")
            return

        popularity = PopularityBasedRecommender(df)
        content = ContentBasedRecommender(df)
        collaborative = CollaborativeFilteringRecommender(df)
        hybrid = HybridRecommender(df)

        user_values = df["user_id"].dropna().astype(str).tolist() if "user_id" in df.columns and not df.empty else []
        sample_user = next((u for u in user_values if u), None)
        if sample_user is None:
            print("ML_WARN: no user interactions available")
            return

        recs = hybrid.get_recommendations(str(sample_user), top_n=5)
        print(f"ML_OK: generated {len(recs)} hybrid recommendations for user {sample_user}")
        print(recs)
    except Exception as exc:  # pragma: no cover
        print(f"ML_FAIL: {exc}")


if __name__ == "__main__":
    main()
