/** バッジ用の深度表示。4文字以内（例: 320m / 1.2k / 12k）。 */
export function formatBadge(depthM: number): string {
  if (!Number.isFinite(depthM) || depthM < 0) return '0m';
  if (depthM < 1000) return `${Math.floor(depthM)}m`;
  if (depthM < 10_000) return `${(Math.floor(depthM / 100) / 10).toFixed(1)}k`;
  return `${Math.min(999, Math.floor(depthM / 1000))}k`;
}
