export function mergeRecentlyViewedProduct(recentlyViewed = [], recommendations = []) {
  const recentProduct = recentlyViewed[0];
  const recentProductId = recentProduct == null ? null : String(recentProduct.id);

  return [
    ...(recentProduct ? [{ product: recentProduct, isRecentlyViewed: true }] : []),
    ...recommendations
      .filter(product => String(product.id) !== recentProductId)
      .map(product => ({ product, isRecentlyViewed: false })),
  ];
}
