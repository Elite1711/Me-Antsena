import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

from .recommender_core import normalize_recommender_dataframe


class CollaborativeFilteringRecommender:
    def __init__(self, df):
        self.df = normalize_recommender_dataframe(df)
        self.user_item_matrix = pd.DataFrame()
        self.user_similarity = pd.DataFrame()

        if self.df.empty:
            return

        self.df = self.df.copy()
        if "user_id" not in self.df.columns:
            return
        self.df["user_id"] = self.df["user_id"].fillna("").astype(str)
        self.df["item_id"] = self.df["item_id"].astype(str)
        if self.df["user_id"].eq("").all():
            return
        self.user_item_matrix = self.df.pivot_table(
            index="user_id",
            columns="item_id",
            values="rating",
            aggfunc="mean",
        ).fillna(0)

        if self.user_item_matrix.empty:
            return

        self.user_similarity = pd.DataFrame(
            cosine_similarity(self.user_item_matrix),
            index=self.user_item_matrix.index,
            columns=self.user_item_matrix.index,
        )

    def get_recommendations(self, user_id, top_n=10):
        user_id = str(user_id)
        if self.df.empty or self.user_item_matrix.empty:
            return []

        if user_id not in self.user_item_matrix.index:
            item_scores = self.df.groupby("item_id")["rating"].mean().sort_values(ascending=False)
            return [str(item_id) for item_id in item_scores.head(top_n).index.tolist()]

        seen = set(self.df[self.df["user_id"].astype(str) == user_id]["item_id"].astype(str))
        similarity_scores = self.user_similarity.loc[user_id].copy()
        similarity_scores = similarity_scores[similarity_scores > 0]

        ranked_scores = {}
        for other_user, sim in similarity_scores.items():
            if other_user == user_id:
                continue
            other_items = self.user_item_matrix.loc[other_user]
            for item_id, rating in other_items.items():
                if item_id in seen or rating <= 0:
                    continue
                ranked_scores[item_id] = ranked_scores.get(item_id, 0.0) + float(rating) * float(sim)

        if not ranked_scores:
            item_scores = self.df.groupby("item_id")["rating"].mean().sort_values(ascending=False)
            return [str(item_id) for item_id in item_scores.head(top_n).index.tolist()]

        return [
            str(item_id)
            for item_id, _ in sorted(ranked_scores.items(), key=lambda kv: kv[1], reverse=True)[:top_n]
        ]

