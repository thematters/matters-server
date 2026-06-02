import type { Connections, ValueOf } from '#definitions/index.js'

import {
  NODE_TYPES,
  MOMENT_FEED_STATE,
  MOMENT_FEED_REVIEWED_BY,
} from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import { SystemService, UserService, AtomService } from '#connectors/index.js'

import { genConnections, closeConnections, testClient } from '../utils.js'

let connections: Connections
let systemService: SystemService
let userService: UserService
let atomService: AtomService

beforeAll(async () => {
  connections = await genConnections()
  systemService = new SystemService(connections)
  userService = new UserService(connections)
  atomService = new AtomService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const setFeatureFlag = async (flag: 'on' | 'off') => {
  await systemService.setFeatureFlag({ name: 'hottest_moment_feed', flag })
}

const seedApplication = async (state: ValueOf<typeof MOMENT_FEED_STATE>) => {
  const user = await userService.create()
  await atomService.create({
    table: 'moment_feed_user',
    data: { userId: user.id, state },
  })
  return user
}

const APPLY_MOMENT_FEED = /* GraphQL */ `
  mutation {
    applyMomentFeed {
      id
    }
  }
`

const UPDATE_STATE = /* GraphQL */ `
  mutation ($input: UpdateMomentFeedApplicationStateInput!) {
    updateMomentFeedApplicationState(input: $input) {
      id
      oss {
        momentFeedApplication {
          state
          reviewedBy
        }
      }
    }
  }
`

const HOTTEST_MOMENTS = /* GraphQL */ `
  query {
    viewer {
      recommendation {
        hottestMoments(input: { first: 10 }) {
          totalCount
        }
      }
    }
  }
`

const HOTTEST_MOMENTS_OSS = /* GraphQL */ `
  query {
    viewer {
      recommendation {
        hottestMoments(input: { first: 10, oss: true }) {
          totalCount
        }
      }
    }
  }
`

const IS_MOMENT_FEED_APPLIED = /* GraphQL */ `
  query {
    viewer {
      isMomentFeedApplied
    }
  }
`

const OSS_MOMENT_FEED_USERS = /* GraphQL */ `
  query ($input: MomentFeedUsersInput!) {
    oss {
      momentFeedUsers(input: $input) {
        totalCount
        edges {
          node {
            id
          }
        }
      }
    }
  }
`

describe('mutation applyMomentFeed', () => {
  test('feature flag off rejects the application', async () => {
    await setFeatureFlag('off')
    const server = await testClient({ isAuth: true, connections })
    const { errors } = await server.executeOperation({
      query: APPLY_MOMENT_FEED,
    })
    expect(errors).toBeDefined()
  })

  test('creates an application when flag is on', async () => {
    await setFeatureFlag('on')
    const server = await testClient({ isAuth: true, connections })
    const { errors, data } = await server.executeOperation({
      query: APPLY_MOMENT_FEED,
    })
    expect(errors).toBeUndefined()
    expect(data?.applyMomentFeed?.id).toBeDefined()
  })

  test('rejects a duplicate application', async () => {
    await setFeatureFlag('on')
    const server = await testClient({ isAuth: true, connections })
    const { errors } = await server.executeOperation({
      query: APPLY_MOMENT_FEED,
    })
    expect(errors).toBeDefined()
  })
})

describe('query recommendation.hottestMoments', () => {
  test('returns empty connection when flag is off', async () => {
    await setFeatureFlag('off')
    const server = await testClient({ isAuth: true, connections })
    const { errors, data } = await server.executeOperation({
      query: HOTTEST_MOMENTS,
    })
    expect(errors).toBeUndefined()
    expect(data?.viewer?.recommendation?.hottestMoments?.totalCount).toBe(0)
  })

  test('admin bypasses the flag with oss input', async () => {
    await setFeatureFlag('off')
    const server = await testClient({
      isAdmin: true,
      isAuth: true,
      connections,
    })
    const { errors } = await server.executeOperation({
      query: HOTTEST_MOMENTS_OSS,
    })
    expect(errors).toBeUndefined()
  })

  test('rejects oss input from a non-admin viewer', async () => {
    await setFeatureFlag('off')
    const server = await testClient({ isAuth: true, connections })
    const { errors } = await server.executeOperation({
      query: HOTTEST_MOMENTS_OSS,
    })
    expect(errors).toBeDefined()
  })
})

describe('mutation updateMomentFeedApplicationState', () => {
  test('admin approves a pending application', async () => {
    const user = await seedApplication(MOMENT_FEED_STATE.pending)
    const server = await testClient({
      isAdmin: true,
      isAuth: true,
      connections,
    })
    const { errors, data } = await server.executeOperation({
      query: UPDATE_STATE,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.User, id: user.id }),
          state: MOMENT_FEED_STATE.approved,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(
      data?.updateMomentFeedApplicationState?.oss?.momentFeedApplication?.state
    ).toBe(MOMENT_FEED_STATE.approved)
    expect(
      data?.updateMomentFeedApplicationState?.oss?.momentFeedApplication
        ?.reviewedBy
    ).toBe(MOMENT_FEED_REVIEWED_BY.admin)
  })

  test('rejects an invalid transition', async () => {
    const user = await seedApplication(MOMENT_FEED_STATE.pending)
    const server = await testClient({
      isAdmin: true,
      isAuth: true,
      connections,
    })
    const { errors } = await server.executeOperation({
      query: UPDATE_STATE,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.User, id: user.id }),
          state: MOMENT_FEED_STATE.revoked,
        },
      },
    })
    expect(errors).toBeDefined()
  })
})

describe('query oss.momentFeedUsers', () => {
  test('admin lists applications filtered by state', async () => {
    const user = await seedApplication(MOMENT_FEED_STATE.pending)
    const server = await testClient({
      isAdmin: true,
      isAuth: true,
      connections,
    })
    const { errors, data } = await server.executeOperation({
      query: OSS_MOMENT_FEED_USERS,
      variables: { input: { first: 50, states: [MOMENT_FEED_STATE.pending] } },
    })
    expect(errors).toBeUndefined()
    const ids = data?.oss?.momentFeedUsers?.edges?.map(
      (edge: { node: { id: string } }) => edge.node.id
    )
    expect(ids).toContain(toGlobalId({ type: NODE_TYPES.User, id: user.id }))
  })
})

describe('query viewer.isMomentFeedApplied', () => {
  test('returns true when an approved application exists', async () => {
    const user = await seedApplication(MOMENT_FEED_STATE.approved)
    const server = await testClient({
      connections,
      context: { viewer: user },
      isAuth: true,
    })
    const { errors, data } = await server.executeOperation({
      query: IS_MOMENT_FEED_APPLIED,
    })
    expect(errors).toBeUndefined()
    expect(data?.viewer?.isMomentFeedApplied).toBe(true)
  })

  test('returns true when a pending application exists', async () => {
    const user = await seedApplication(MOMENT_FEED_STATE.pending)
    const server = await testClient({
      connections,
      context: { viewer: user },
      isAuth: true,
    })
    const { errors, data } = await server.executeOperation({
      query: IS_MOMENT_FEED_APPLIED,
    })
    expect(errors).toBeUndefined()
    expect(data?.viewer?.isMomentFeedApplied).toBe(true)
  })

  test('returns false when no application exists', async () => {
    const user = await userService.create()
    const server = await testClient({
      connections,
      context: { viewer: user },
      isAuth: true,
    })
    const { errors, data } = await server.executeOperation({
      query: IS_MOMENT_FEED_APPLIED,
    })
    expect(errors).toBeUndefined()
    expect(data?.viewer?.isMomentFeedApplied).toBe(false)
  })
})
