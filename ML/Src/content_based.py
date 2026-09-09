import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .recommender_core import normalize_recommender_dataframe


class ContentBasedRecommender:
    def __init__(self, df):
        self.df = normalize_recommender_dataframe(df)
        self.similarity = pd.DataFrame()

        if self.df.empty:
            return

        self.df = self.df.drop_duplicates(subset=["item_id"]).copy()
        if "user_id" not in self.df.columns:
            self.df["user_id"] = ""
        self.df["user_id"] = self.df["user_id"].fillna("").astype(str)

        self.df["content_text"] = (
            self.df["name"].fillna("").astype(str)
            + " "
            + self.df["description"].fillna("").astype(str)
            + " "
            + self.df["category"].fillna("").astype(str)
            + " "
            + self.df["tags"].fillna("").astype(str)
            + " "
            + self.df["brand"].fillna("").astype(str)
        )

        vectorizer = TfidfVectorizer(stop_words="english")
        matrix = vectorizer.fit_transform(self.df["content_text"])
        self.similarity = pd.DataFrame(
            cosine_similarity(matrix),
            index=self.df["item_id"].astype(str),
            columns=self.df["item_id"].astype(str),
        )

    def get_recommendations(self, user_id, top_n=5):
        if self.df.empty or "user_id" not in self.df.columns or self.df["user_id"].fillna("").eq("").all():
            return []

        user_id = str(user_id)
        user_items = self.df[self.df["user_id"].astype(str) == user_id]["item_id"].astype(str)
        if user_items.empty:
            return []

        seen = set(user_items)
        scores = pd.Series(dtype=float)
        for product_id in user_items:
            if product_id not in self.similarity.index:
                continue
            item_scores = self.similarity.loc[product_id].copy()
            item_scores = item_scores[~item_scores.index.isin(seen)]
            if item_scores.empty:
                continue
            scores = pd.concat([scores, item_scores])

        if scores.empty:
            return []

        recommendation_scores = scores.groupby(level=0).sum().sort_values(ascending=False)
        return [str(item_id) for item_id in recommendation_scores.head(top_n).index.tolist()]
