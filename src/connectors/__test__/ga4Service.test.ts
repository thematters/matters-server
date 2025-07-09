import type { Connections } from '#definitions/index.js'

import { genConnections, closeConnections } from '#connectors/__test__/utils.js'

import { GA4Service, getLocalDateString, TABLE_NAME } from '../ga4Service.js'

let connections: Connections
let ga4Service: GA4Service

beforeAll(async () => {
  connections = await genConnections()
  ga4Service = new GA4Service(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

test('saveGA4Data', async () => {
  const startDate = '2021-01-01'
  const endDate = '2021-01-01'

  // insert
  await ga4Service.saveGA4Data({ '1': 1, '2': 2 }, { startDate, endDate })

  const rows = await connections
    .knex(TABLE_NAME)
    .select('*')
    .where({ dateRange: `[${startDate}, ${endDate}]` })
  expect(rows.length).toBe(2)

  // insert and update
  await ga4Service.saveGA4Data({ '1': 2, '3': 3 }, { startDate, endDate })

  const rows2 = await connections
    .knex(TABLE_NAME)
    .select('*')
    .where({ dateRange: `[${startDate}, ${endDate}]` })
  expect(rows2.length).toBe(3)
  for (const row of rows2) {
    if (row.articleId === '1') {
      expect(row.totalUsers).toBe('2')
    }
  }
})

test('getLocalDateString', async () => {
  const date = new Date('2021-01-01')
  const dateStr = getLocalDateString(date)
  expect(dateStr).toBe('2021-01-01')
})

test('convertAndMerge', async () => {
  const data = [
    {
      path: '/@zeck_test_10/1-未命名-bafybeiggtv7fcj5dci5x4hoogq7wzutortc3z2jyrsfzgdlwo7b4wjju4y',
      totalUsers: '5',
    },
    { path: '/@alice_at_dev', totalUsers: '1' },
    {
      // illegal id
      path: '/@alice_at_dev/21094-amet-fugiat-commodo-pariatur-bafybeiffgowmxvnmdndqqptvpstu4a425scomyvh37koxy3ifind643sne',
      totalUsers: '1',
    },
    { path: '/@bob_at_dev', totalUsers: '1' },
  ]
  const result = await ga4Service.convertAndMerge(data)
  expect(result).toStrictEqual({
    '1': 5,
  })
})

test('pathToId', async () => {
  const id1 = await ga4Service.pathToId(
    '/@zeck_test_10/1-未命名-bafybeiggtv7fcj5dci5x4hoogq7wzutortc3z2jyrsfzgdlwo7b4wjju4y'
  )
  expect(id1).toBe('1')

  const id2 = await ga4Service.pathToId('/a/short-hash-1')
  expect(id2).toBe('1')

  const id3 = await ga4Service.pathToId('/a/short-hash-1/edit')
  expect(id3).toBe(null)

  const id4 = await ga4Service.pathToId('/a/not-exsit-short-hash')
  expect(id4).toBe(null)
})
