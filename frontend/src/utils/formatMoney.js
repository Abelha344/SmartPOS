export const formatMoney = (value, currency = "ETB") => {
  const amount = Number(value);
  if (currency === "ETB") {
    return `ETB ${amount.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
};
