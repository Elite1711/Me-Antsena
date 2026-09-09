import pandas as pd

from .recommender_core import normalize_recommender_dataframe


class PopularityBasedRecommender:
    def __init__(self, df):
        self.df = normalize_recommender_dataframe(df)

    def get_most_popular_items(self, top_n=5):
        if self.df.empty:
            return pd.DataFrame(columns=["item_id", "name", "interaction_count", "avg_rating"])

        stats = self.df.groupby("item_id", as_index=False).agg(
            interaction_count=("rating", "size"),
            avg_rating=("rating", "mean"),
            name=("name", "first"),
        )
        return stats.sort_values(["interaction_count", "avg_rating"], ascending=[False, False]).head(top_n).reset_index(drop=True)

    def get_trending_items(self, period_days=15, top_n=5):
        if self.df.empty or "timestamp" not in self.df.columns:
            stats = self.get_most_popular_items(top_n=top_n)
            return stats[["item_id", "name", "interaction_count", "avg_rating"]]

        df = self.df.copy()
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
        recent = df[df["timestamp"] >= df["timestamp"].max() - pd.Timedelta(days=period_days)]
        if recent.empty:
            return self.get_most_popular_items(top_n=top_n)

        stats = recent.groupby("item_id", as_index=False).agg(
            interaction_count=("rating", "size"),
            avg_rating=("rating", "mean"),
            name=("name", "first"),
        )
        return stats.sort_values(["interaction_count", "avg_rating"], ascending=[False, False]).head(top_n).reset_index(drop=True)

    def get_top_rated_items(self, min_interactions=1, top_n=5):
        if self.df.empty:
            return pd.DataFrame(columns=["item_id", "name", "interaction_count", "avg_rating"])

        stats = self.df.groupby("item_id", as_index=False).agg(
            interaction_count=("rating", "size"),
            avg_rating=("rating", "mean"),
            name=("name", "first"),
        )
        stats = stats[stats["interaction_count"] >= min_interactions]
        return stats.sort_values(["avg_rating", "interaction_count"], ascending=[False, False]).head(top_n).reset_index(drop=True)
