import { HOUR } from 'common/enums'

/**
 * Get punish date exipired date (1 + n days).
 *
 */
export const getPunishExpiredDate = (days: number) => {
  const offset = days > 0 ? 1 + days : 0
  const date = new Date(Date.now() + 8 * HOUR)
  date.setUTCHours(0, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  date.setHours(date.getHours() - 8)
  return date
}

export const getUTC8Midnight = () => {
  const date = new Date(Date.now() + 8 * HOUR)
  date.setUTCHours(0, 0, 0, 0)
  date.setHours(date.getHours() - 8)
  return date
}

export const getUTC8NextMonthDayOne = () => {
  const date = new Date(Date.now() + 8 * HOUR)
  const month = date.getMonth()
  date.setUTCHours(0, 0, 0, 0)
  if (month === 11) {
    date.setFullYear(date.getFullYear() + 1)
    date.setMonth(0)
    date.setDate(1)
  } else {
    date.setMonth(month + 1)
    date.setDate(1)
  }
  date.setHours(date.getHours() - 8)
  return date.getTime()
}
