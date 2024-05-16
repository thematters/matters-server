import type { Connections } from 'definitions'

import { AtomService } from 'connectors'

import { genConnections, closeConnections } from './utils'

let connections: Connections
let atomService: AtomService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

test('find customer', async () => {
  // only return cardLast4
  const customer = await atomService.findFirst({
    table: 'customer',
    where: {
      id: '1',
    },
  })
  expect(customer).toBeDefined()
  expect(customer?.cardLast4).toBeDefined()
  expect(customer?.card_last_4).toBeUndefined()

  // cardLast4 can not be used as parameter
  expect(
    atomService.findFirst({
      table: 'customer',
      where: { cardLast4: customer.cardLast4 },
    })
  ).rejects.toThrow()

  const customer2 = await atomService.findFirst({
    table: 'customer',
    where: { card_last_4: customer.cardLast4 },
  })
  expect(customer2).toBeDefined()
})
