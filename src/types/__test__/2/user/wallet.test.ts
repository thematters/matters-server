import type { Connections } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'

import { testClient, genConnections, closeConnections } from '../../utils.js'

let connections: Connections

beforeAll(async () => {
  connections = await genConnections()
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('wallet', () => {
  const GET_BALANCE = /* GraphQL */ `
    query ($input: NodeInput!) {
      node(input: $input) {
        ... on User {
          wallet {
            balance {
              HKD
            }
          }
        }
      }
    }
  `
  const GET_BALANCE_FROM_VIEWER = /* GraphQL */ `
    query {
      viewer {
        wallet {
          balance {
            HKD
          }
        }
      }
    }
  `

  test('authenticated user can query their own wallet balance', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data } = await server.executeOperation({
      query: GET_BALANCE,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.User, id: 1 }),
        },
      },
    })
    expect(data?.node.wallet.balance.HKD).toBeDefined()

    const { data: viewerData } = await server.executeOperation({
      query: GET_BALANCE_FROM_VIEWER,
    })
    expect(viewerData?.viewer.wallet.balance.HKD).toBeDefined()
  })

  test("authenticated user cannot query another user's wallet balance", async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { errors } = await server.executeOperation({
      query: GET_BALANCE,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.User, id: 2 }),
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })

  test('unauthenticated user cannot query any wallet balance', async () => {
    const server = await testClient({
      isAuth: false,
      connections,
    })
    const { errors } = await server.executeOperation({
      query: GET_BALANCE,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.User, id: 1 }),
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')

    const { errors: viewerErrors } = await server.executeOperation({
      query: GET_BALANCE_FROM_VIEWER,
    })
    expect(viewerErrors).toBeUndefined()
  })

  const GET_CARD_LAST4 = /* GraphQL */ `
    query ($input: NodeInput!) {
      node(input: $input) {
        ... on User {
          wallet {
            cardLast4
          }
        }
      }
    }
  `

  const GET_CARD_LAST4_FROM_VIEWER = /* GraphQL */ `
    query {
      viewer {
        wallet {
          cardLast4
        }
      }
    }
  `

  test("authenticated user can query their own card's last 4 digits", async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data } = await server.executeOperation({
      query: GET_CARD_LAST4,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.User, id: 1 }),
        },
      },
    })
    expect(data?.node.wallet.cardLast4).toBeDefined()

    const { data: viewerData } = await server.executeOperation({
      query: GET_CARD_LAST4_FROM_VIEWER,
    })
    expect(viewerData?.viewer.wallet.cardLast4).toBeDefined()
  })

  test("authenticated user cannot query another user's card's last 4 digits", async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { errors } = await server.executeOperation({
      query: GET_CARD_LAST4,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.User, id: 2 }),
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })

  test("unauthenticated user cannot query any card's last 4 digits", async () => {
    const server = await testClient({
      isAuth: false,
      connections,
    })
    const { errors } = await server.executeOperation({
      query: GET_CARD_LAST4,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.User, id: 1 }),
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')

    const { errors: viewerErrors } = await server.executeOperation({
      query: GET_CARD_LAST4_FROM_VIEWER,
    })
    expect(viewerErrors).toBeUndefined()
  })

  const GET_CUSTOMER_PORTAL = /* GraphQL */ `
    query ($input: NodeInput!) {
      node(input: $input) {
        ... on User {
          wallet {
            customerPortal
          }
        }
      }
    }
  `

  const GET_CUSTOMER_PORTAL_FROM_VIEWER = /* GraphQL */ `
    query {
      viewer {
        wallet {
          customerPortal
        }
      }
    }
  `

  test('authenticated user can query their own customer portal', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data } = await server.executeOperation({
      query: GET_CUSTOMER_PORTAL,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.User, id: 1 }),
        },
      },
    })
    expect(data?.node.wallet.customerPortal).toBeDefined()

    const { data: viewerData } = await server.executeOperation({
      query: GET_CUSTOMER_PORTAL_FROM_VIEWER,
    })
    expect(viewerData?.viewer.wallet.customerPortal).toBeDefined()
  })

  test("authenticated user cannot query another user's customer portal", async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { errors } = await server.executeOperation({
      query: GET_CUSTOMER_PORTAL,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.User, id: 2 }),
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })

  test('unauthenticated user cannot query any customer portal', async () => {
    const server = await testClient({
      isAuth: false,
      connections,
    })
    const { errors } = await server.executeOperation({
      query: GET_CUSTOMER_PORTAL,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.User, id: 1 }),
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')

    const { errors: viewerErrors } = await server.executeOperation({
      query: GET_CUSTOMER_PORTAL_FROM_VIEWER,
    })
    expect(viewerErrors).toBeUndefined()
  })

  const GET_STRIPE_ACCOUNT = /* GraphQL */ `
    query ($input: NodeInput!) {
      node(input: $input) {
        ... on User {
          wallet {
            stripeAccount {
              id
            }
          }
        }
      }
    }
  `

  const GET_STRIPE_ACCOUNT_FROM_VIEWER = /* GraphQL */ `
    query {
      viewer {
        wallet {
          stripeAccount {
            id
          }
        }
      }
    }
  `

  test('authenticated user can query their own stripe account', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data } = await server.executeOperation({
      query: GET_STRIPE_ACCOUNT,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.User, id: 1 }),
        },
      },
    })
    expect(data?.node.wallet.stripeAccount).toBeDefined()

    const { data: viewerData } = await server.executeOperation({
      query: GET_STRIPE_ACCOUNT_FROM_VIEWER,
    })
    expect(viewerData?.viewer.wallet.stripeAccount).toBeDefined()
  })

  test("authenticated user cannot query another user's stripe account", async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { errors } = await server.executeOperation({
      query: GET_STRIPE_ACCOUNT,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.User, id: 2 }),
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })

  test('unauthenticated user cannot query any stripe account', async () => {
    const server = await testClient({
      isAuth: false,
      connections,
    })
    const { errors } = await server.executeOperation({
      query: GET_STRIPE_ACCOUNT,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.User, id: 1 }),
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')

    const { errors: viewerErrors } = await server.executeOperation({
      query: GET_STRIPE_ACCOUNT_FROM_VIEWER,
    })
    expect(viewerErrors).toBeUndefined()
  })

  const GET_TRANSACTIONS = /* GraphQL */ `
    query ($input: NodeInput!) {
      node(input: $input) {
        ... on User {
          wallet {
            transactions(input: {}) {
              edges {
                node {
                  id
                }
              }
            }
          }
        }
      }
    }
  `

  const GET_TRANSACTIONS_FROM_VIEWER = /* GraphQL */ `
    query {
      viewer {
        wallet {
          transactions(input: {}) {
            edges {
              node {
                id
              }
            }
          }
        }
      }
    }
  `

  test('authenticated user can query their own transactions', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data } = await server.executeOperation({
      query: GET_TRANSACTIONS,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.User, id: 1 }),
        },
      },
    })
    expect(data?.node.wallet.transactions.edges).toBeDefined()

    const { data: viewerData } = await server.executeOperation({
      query: GET_TRANSACTIONS_FROM_VIEWER,
    })
    expect(viewerData?.viewer.wallet.transactions.edges).toBeDefined()
  })

  test("authenticated user cannot query another user's transactions", async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { errors } = await server.executeOperation({
      query: GET_TRANSACTIONS,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.User, id: 2 }),
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })

  test('unauthenticated user cannot query any transactions', async () => {
    const server = await testClient({
      isAuth: false,
      connections,
    })
    const { errors } = await server.executeOperation({
      query: GET_TRANSACTIONS,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.User, id: 1 }),
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')

    const { errors: viewerErrors } = await server.executeOperation({
      query: GET_TRANSACTIONS_FROM_VIEWER,
    })
    expect(viewerErrors).toBeUndefined()
  })
})
