/**
 * Calculate optimal Bloom filter parameters
 * @param capacity Expected number of items (n)
 * @param errorRate Desired false positive rate (p)
 * @returns Optimal bit size (m) and hash count (k)
 */
export function calculateOptimalParams(
  capacity: number,
  errorRate: number
): { size: number; hashCount: number } {
  // m = -n * ln(p) / (ln(2)^2)
  const size = Math.ceil((-capacity * Math.log(errorRate)) / (Math.LN2 * Math.LN2));

  // k = (m/n) * ln(2)
  const hashCount = Math.round((size / capacity) * Math.LN2);

  return { size, hashCount };
}
