export function filterAndSortProducts(products, { minRating, sort } = {}) {
  let result = products;

  if (minRating !== undefined && minRating !== null && minRating !== "") {
    const threshold = Number(minRating);
    result = result.filter(product => Number(product.rating) >= threshold);
  }

  if (sort === "rating") {
    return [...result].sort((left, right) => Number(right.rating) - Number(left.rating));
  }

  return result;
}
