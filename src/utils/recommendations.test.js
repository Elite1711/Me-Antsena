import assert from "node:assert/strict";
import test from "node:test";
import { mergeRecentlyViewedProduct } from "./recommendations.js";

test("recently viewed product is displayed first and is not duplicated in content recommendations", () => {
  const recent = { id: 6121, name: "Smartphone" };
  const recommendations = [
    { id: 6121, name: "Smartphone" },
    { id: 6122, name: "Casque" },
  ];

  assert.deepEqual(mergeRecentlyViewedProduct([recent], recommendations), [
    { product: recent, isRecentlyViewed: true },
    { product: recommendations[1], isRecentlyViewed: false },
  ]);
});

test("content recommendations are preserved when there is no recent view", () => {
  const recommendations = [{ id: 6122, name: "Casque" }];

  assert.deepEqual(mergeRecentlyViewedProduct([], recommendations), [
    { product: recommendations[0], isRecentlyViewed: false },
  ]);
});
