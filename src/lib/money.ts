/**
 * Money is stored as an integer number of poisha (1/100 taka) so totals are
 * exact; only the display layer converts to a decimal amount.
 */
export const CURRENCY_SYMBOL = "৳";

export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

export function toMajorUnits(minor: number): number {
  return Math.round(minor) / 100;
}

export function formatCurrency(minor: number): string {
  const value = toMajorUnits(minor);
  return `${CURRENCY_SYMBOL}${value.toLocaleString("en-BD", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatAmountPlain(minor: number): string {
  return toMajorUnits(minor).toFixed(2);
}

/**
 * ASCII rendering of an amount. PDF reports use the standard PDF fonts, which
 * are WinAnsi-encoded and cannot represent "\u09f3".
 */
export function formatCurrencyAscii(minor: number): string {
  return `BDT ${toMajorUnits(minor).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
