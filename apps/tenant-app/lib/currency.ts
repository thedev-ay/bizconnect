export function formatCurrency(
  amount: number,
  currencySymbol: string,
  currencyLocale: string
): string {
  return `${currencySymbol}${amount.toLocaleString(currencyLocale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
