export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const passwordScore = (value = "") => Number(value.length >= 8) + Number(/[A-Z]/.test(value)) + Number(/\d/.test(value)) + Number(/[^A-Za-z0-9]/.test(value));
export function validateRegister(data) {
  const errors = {};
  if (!data.firstName?.trim()) errors.firstName = "Prénom requis";
  if (!data.lastName?.trim()) errors.lastName = "Nom requis";
  if (!isEmail(data.email || "")) errors.email = "Email invalide";
  if ((data.phone || "").replace(/\D/g, "").length < 9) errors.phone = "Téléphone invalide";
  if ((data.password || "").length < 8) errors.password = "8 caractères minimum";
  if (data.password !== data.confirmPassword) errors.confirmPassword = "Les mots de passe ne correspondent pas";
  if (!data.accepted) errors.accepted = "Vous devez accepter les conditions";
  return errors;
}
