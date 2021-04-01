import {
  getPunishExpiredDate,
  getUTC8Midnight,
  getUTC8NextMonday,
  getUTC8NextMonthDayOne,
} from 'common/utils'

const UTC_1975_08_19_16 = new Date('August 19, 1975 16:30:00 GMT+00:00')
const UTC8_1975_08_19_16 = new Date('August 19, 1975 16:30:00 GMT+08:00')
const UTC_2020_01_01_12 = new Date('January 01, 2020 12:30:00 GMT+00:00')
const UTC_2020_02_29_16 = new Date('February 29, 2020 16:30:00 GMT+00:00')
const UTC_2020_11_30_16 = new Date('November 30, 2020 16:30:00 GMT+00:00')
const UTC8_2020_11_30_16 = new Date('November 30, 2020 16:30:00 GMT+08:00')
const UTC_2020_12_31_16 = new Date('December 31, 2020 16:30:00 GMT+00:00')
const UTC8_2020_12_31_16 = new Date('December 31, 2020 16:30:00 GMT+08:00')

test('getPunishExpiredDate', async () => {
  const times = [
    {
      value: UTC_1975_08_19_16,
      expectValue: new Date('August 22, 1975 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC8_1975_08_19_16,
      expectValue: new Date('August 21, 1975 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC_2020_01_01_12,
      expectValue: new Date('January 03, 2020 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC_2020_02_29_16,
      expectValue: new Date('March 03, 2020 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC_2020_11_30_16,
      expectValue: new Date('December 03, 2020 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC8_2020_11_30_16,
      expectValue: new Date('December 02, 2020 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC_2020_12_31_16,
      expectValue: new Date('January 03, 2021 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC8_2020_12_31_16,
      expectValue: new Date('January 02, 2021 00:00:00 GMT+08:00').getTime(),
    },
  ]

  times.forEach(({ value, expectValue }) => {
    expect(getPunishExpiredDate(1, value).getTime()).toBe(expectValue)
  })
})

test('getUTC8Midnight', async () => {
  const times = [
    {
      value: UTC_1975_08_19_16,
      expectValue: new Date('August 20, 1975 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC8_1975_08_19_16,
      expectValue: new Date('August 19, 1975 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC_2020_01_01_12,
      expectValue: new Date('January 01, 2020 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC_2020_02_29_16,
      expectValue: new Date('March 01, 2020 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC_2020_11_30_16,
      expectValue: new Date('December 01, 2020 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC8_2020_11_30_16,
      expectValue: new Date('November 30, 2020 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC_2020_12_31_16,
      expectValue: new Date('January 01, 2021 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC8_2020_12_31_16,
      expectValue: new Date('December 31, 2020 00:00:00 GMT+08:00').getTime(),
    },
  ]

  times.forEach(({ value, expectValue }) => {
    expect(getUTC8Midnight(value).getTime()).toBe(expectValue)
  })
})

test('getUTC8NextMonday', async () => {
  const times = [
    {
      value: UTC_1975_08_19_16,
      expectValue: new Date('August 25, 1975 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC8_1975_08_19_16,
      expectValue: new Date('August 25, 1975 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC_2020_01_01_12,
      expectValue: new Date('January 06, 2020 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC_2020_02_29_16,
      expectValue: new Date('March 02, 2020 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC_2020_11_30_16,
      expectValue: new Date('Decemeber 07, 2020 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC8_2020_11_30_16,
      expectValue: new Date('Decemeber 07, 2020 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC_2020_12_31_16,
      expectValue: new Date('January 04, 2021 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC8_2020_12_31_16,
      expectValue: new Date('January 04, 2021 00:00:00 GMT+08:00').getTime(),
    },
  ]

  times.forEach(({ value, expectValue }) => {
    expect(getUTC8NextMonday(value)).toBe(expectValue)
  })
})

test('getUTC8NextMonthDayOne', async () => {
  const times = [
    {
      value: UTC_1975_08_19_16,
      expectValue: new Date('September 01, 1975 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC8_1975_08_19_16,
      expectValue: new Date('September 01, 1975 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC_2020_01_01_12,
      expectValue: new Date('February 01, 2020 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC_2020_02_29_16,
      expectValue: new Date('April 01, 2020 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC_2020_11_30_16,
      expectValue: new Date('January 01, 2021 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC8_2020_11_30_16,
      expectValue: new Date('December 01, 2020 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC_2020_12_31_16,
      expectValue: new Date('February 01, 2021 00:00:00 GMT+08:00').getTime(),
    },
    {
      value: UTC8_2020_12_31_16,
      expectValue: new Date('January 01, 2021 00:00:00 GMT+08:00').getTime(),
    },
  ]

  times.forEach(({ value, expectValue }) => {
    expect(getUTC8NextMonthDayOne(value)).toBe(expectValue)
  })
})
