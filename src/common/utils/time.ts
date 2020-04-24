/**
 * Get punish date exipired date (1 + n days).
 *
 */
export const getPunishExpiredDate = (days: number) => {
  const offset = days > 0 ? 1 + days : 0
  const date = new Date(Date.now())
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return date
}
