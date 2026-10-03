import assert from "node:assert/strict";
import test from "node:test";
import { filterAndSortProducts } from "./catalog.js";
import { validateRegister } from "./validation.js";

test("registration accepts an empty optional phone number", () => {
  const errors = validateRegister({
    firstName: "Aina",
    lastName: "R.",
    email: "aina@example.com",
    phone: "",
    password: "Password1!",
    confirmPassword: "Password1!",
    accepted: true,
  });

  assert.equal(errors.phone, undefined);
  assert.deepEqual(errors, {});
});

test("registration rejects a non-empty phone number that is too short", () => {
  const errors = validateRegister({
    firstName: "Aina",
    lastName: "R.",
    email: "aina@example.com",
    phone: "123",
    password: "Password1!",
    confirmPassword: "Password1!",
    accepted: true,
  });

  assert.equal(errors.phone, "Téléphone invalide");
});

test("catalog rating filter and popularity sort use calculated ratings", () => {
  const products = [
    { id: 1, rating: 3 },
    { id: 2, rating: 4.8 },
    { id: 3, rating: 4.2 },
  ];

  assert.deepEqual(
    filterAndSortProducts(products, { minRating: "4", sort: "rating" }).map(product => product.id),
    [2, 3],
  );
  assert.deepEqual(
    filterAndSortProducts(products, { sort: "rating" }).map(product => product.id),
    [2, 3, 1],
  );
});
