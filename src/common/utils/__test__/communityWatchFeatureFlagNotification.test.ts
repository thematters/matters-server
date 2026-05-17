import { jest } from '@jest/globals'

import {
  NODE_TYPES,
  OFFICIAL_NOTICE_EXTEND_TYPE,
  USER_FEATURE_FLAG_TYPE,
} from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import putUserFeatureFlags from '#mutations/system/putUserFeatureFlags.js'

const mutation = putUserFeatureFlags as any

const createContext = ({
  previousFlags = [],
}: {
  previousFlags?: Array<{ type: string }>
} = {}) => {
  const trigger = jest.fn<any>()
  const updateFeatureFlags = jest.fn<any>()
  const invalidateRedis = { smembers: async () => [] }

  return {
    context: {
      dataSources: {
        userService: {
          findFeatureFlags: jest.fn<any>().mockResolvedValue(previousFlags),
          updateFeatureFlags,
        },
        atomService: {
          userIdLoader: {
            loadMany: jest.fn<any>().mockResolvedValue([{ id: '1' }]),
          },
        },
        notificationService: { trigger },
        connections: { redis: invalidateRedis },
      },
    },
    trigger,
    updateFeatureFlags,
  }
}

describe('putUserFeatureFlags community watch notifications', () => {
  test('rejects empty user ids', async () => {
    const { context } = createContext()

    await expect(
      mutation({}, { input: { ids: [], flags: [] } }, context, {} as any)
    ).rejects.toThrow('"ids" is required')
  })

  test('notifies when enabling community watch', async () => {
    const { context, trigger, updateFeatureFlags } = createContext()

    await mutation(
      {},
      {
        input: {
          ids: [toGlobalId({ type: NODE_TYPES.User, id: '1' })],
          flags: [USER_FEATURE_FLAG_TYPE.communityWatch],
        },
      },
      context,
      {} as any
    )

    expect(updateFeatureFlags).toHaveBeenCalledWith('1', [
      USER_FEATURE_FLAG_TYPE.communityWatch,
    ])
    expect(trigger).toHaveBeenCalledWith({
      event: OFFICIAL_NOTICE_EXTEND_TYPE.community_watch_enabled,
      recipientId: '1',
      data: { link: 'https://community-watch.matters.town/rules/' },
    })
  })

  test('notifies when disabling community watch', async () => {
    const { context, trigger } = createContext({
      previousFlags: [{ type: USER_FEATURE_FLAG_TYPE.communityWatch }],
    })

    await mutation(
      {},
      {
        input: {
          ids: [toGlobalId({ type: NODE_TYPES.User, id: '1' })],
          flags: [],
        },
      },
      context,
      {} as any
    )

    expect(trigger).toHaveBeenCalledWith({
      event: OFFICIAL_NOTICE_EXTEND_TYPE.community_watch_disabled,
      recipientId: '1',
      data: { link: 'https://community-watch.matters.town/rules/' },
    })
  })

  test('does not notify when community watch state is unchanged', async () => {
    const { context, trigger } = createContext()

    await mutation(
      {},
      {
        input: {
          ids: [toGlobalId({ type: NODE_TYPES.User, id: '1' })],
          flags: [USER_FEATURE_FLAG_TYPE.bypassSpamDetection],
        },
      },
      context,
      {} as any
    )

    expect(trigger).not.toHaveBeenCalled()
  })
})
