/**
 * Format a price as USD with 2 decimal places.
 * Example: 68432.17 → "$68,432.17"
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Format a percentage with sign and 1 decimal place.
 * Example: 2.3 → "+2.3%", -1.8 → "-1.8%"
 */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: 'always',
  }).format(value / 100);
}

/**
 * Format an absolute USD change with sign.
 * Example: 1534.22 → "+$1,534.22", -892.40 → "-$892.40"
 */
export function formatAbsoluteChange(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'always',
  }).format(value);
}

/**
 * Format market cap with compact notation.
 * Example: 1340000000000 → "$1.34T", 892450000000 → "$892.45B"
 */
export function formatMarketCap(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a price range with compact notation.
 * Example: (66900, 68900) → "$66.9K — $68.9K"
 *
 * Note: Intl.NumberFormat compact notation capitalizes the suffix (K, M, B, T).
 * The architecture spec shows lowercase "k" but Intl produces uppercase "K".
 * Using Intl output as-is to avoid manual string manipulation (per AC #7).
 */
export function formatRange(low: number, high: number): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${formatter.format(low)} — ${formatter.format(high)}`;
}

/**
 * Format a chart tooltip with price and time.
 * Example: (68432.17, 1711972200000) → "$68,432.17 at 14:30"
 */
export function formatChartTooltip(price: number, timestamp: number): string {
  const formattedPrice = formatPrice(price);
  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date(timestamp));
  return `${formattedPrice} at ${formattedTime}`;
}
