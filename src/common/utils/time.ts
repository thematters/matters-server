import { HOUR } from 'common/enums'

// Get punish date exipired date (1 + n days).
export const getPunishExpiredDate = (days: number) => {
  const date = new Date(Date.now() + 8 * HOUR)
  date.setUTCHours(0, 0, 0, 0)

  const offset = days > 0 ? 1 + days : 0
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
  date.setUTCHours(0, 0, 0, 0)

  const month = date.getMonth()
  const isLastMonthOfYear = month === 11

  // set year
  if (isLastMonthOfYear) {
    date.setFullYear(date.getFullYear() + 1)
  }

  // set month
  if (isLastMonthOfYear) {
    date.setMonth(0)
  } else {
    date.setMonth(month + 1)
  }

  // set date
  date.setDate(1)

  date.setHours(date.getHours() - 8)
  return date.getTime()
}

export const getUTC8NextMonday = () => {
  const date = new Date(Date.now() + 8 * HOUR)
  date.setUTCHours(0, 0, 0, 0)

  // set date
  const offset = (1 + 7 - date.getDay()) % 7
  date.setDate(date.getDate() + offset)

  date.setHours(date.getHours() - 8)
  return date.getTime()
}

export const isArticleLimitedFree = (date: string | Date) => {
  const now = Date.now()
  const endAt = new Date(date).getTime() + HOUR * 24
  return now <= endAt
}
