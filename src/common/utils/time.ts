import { DAY, HOUR } from 'common/enums'

export const getPunishExpiredDate = (days: number) => {
  // if days is -1, then set it as forever
  const offset  = days > 0
    ? 1 + days
    : days < 0
    ? 100 * 365 * DAY
    : 0

  const date = new Date(new Date().getTime())
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return date
}
