export const stockEquivalent = (quantity, unit) => {
  const value = Number(quantity || 0);
  if (unit === "kg" && value >= 1000) return `≈ ${(value / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} tonne(s)`;
  if (unit === "tonne") return `≈ ${(value * 1000).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} kg`;
  if (unit === "g" && value >= 1000) return `≈ ${(value / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} kg`;
  if (unit === "ml" && value >= 1000) return `≈ ${(value / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} L`;
  return "";
};
