import { jest } from '@jest/globals'

import { NODE_TYPES, USER_STATE } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import archiveUsers from '#mutations/user/archiveUsers.js'

const makeUser = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  email: null,
  displayName: `User ${id}`,
  language: 'zh_hant',
  state: USER_STATE.active,
  ...overrides,
})

const makeUserId = (id: string) => toGlobalId({ type: NODE_TYPES.User, id })

const makeContext = ({
  users = {},
  archive = async (id: string) => ({
    ...(users as Record<string, any>)[id],
    state: USER_STATE.archived,
  }),
  viewer = { id: '99', passwordHash: 'hash' },
}: {
  users?: Record<string, any>
  archive?: (id: string) => Promise<any>
  viewer?: Record<string, unknown>
} = {}) => {
  const context = {
    viewer,
    dataSources: {
      atomService: {
        userIdLoader: {
          load: jest.fn(async (id: string) => users[id] ?? null),
        },
      },
      notificationService: {
        mail: {
          sendUserDeletedByAdmin: jest.fn(),
        },
      },
      userService: {
        verifyPassword: jest.fn(),
        archive: jest.fn(archive),
      },
      queues: {
        userQueue: {
          archiveUser: jest.fn(),
        },
      },
    },
  }

  return context
}

const runArchiveUsers = (
  ids: string[],
  password: string,
  context = makeContext()
) =>
  (archiveUsers as any)(
    null,
    { input: { ids, password } },
    context as any,
    {} as any
  )

describe('archiveUsers resolver', () => {
  test('validates input before archiving', async () => {
    await expect(runArchiveUsers([], 'admin-password')).rejects.toThrow(
      'at least one user id is required'
    )

    await expect(
      runArchiveUsers(
        Array.from({ length: 51 }, (_, index) => makeUserId(`${index + 1}`)),
        'admin-password'
      )
    ).rejects.toThrow('cannot archive more than 50 users')

    await expect(runArchiveUsers([makeUserId('1')], '')).rejects.toThrow(
      '`password` is required for archiving users'
    )

    await expect(
      runArchiveUsers(
        [makeUserId('1')],
        'admin-password',
        makeContext({
          viewer: { passwordHash: 'hash' },
        })
      )
    ).rejects.toThrow('`password` is required for archiving users')
  })

  test('archives valid users and reports per-user skips', async () => {
    const users: Record<string, any> = {
      '1': makeUser('1'),
      '2': makeUser('2', { state: USER_STATE.archived }),
      '4': makeUser('4', {
        email: 'archive-user-4@matters.news',
        displayName: 'Archive User 4',
      }),
      '5': makeUser('5'),
      '6': makeUser('6'),
    }
    const context = makeContext({
      users,
      archive: async (id: string) => {
        if (id === '5') {
          throw new Error('archive service failed')
        }
        if (id === '6') {
          throw 'unexpected failure'
        }
        return { ...users[id], state: USER_STATE.archived }
      },
    })

    const result = await runArchiveUsers(
      [
        makeUserId('1'),
        makeUserId('1'),
        makeUserId('2'),
        makeUserId('3'),
        makeUserId('4'),
        makeUserId('5'),
        makeUserId('6'),
      ],
      'admin-password',
      context
    )

    expect(context.dataSources.userService.verifyPassword).toHaveBeenCalledWith(
      { password: 'admin-password', hash: 'hash' }
    )
    expect((result.archived as any[]).map((user) => user.id)).toEqual([
      '1',
      '4',
    ])
    expect(result.skipped).toEqual([
      { id: makeUserId('2'), message: 'user has already been archived' },
      { id: makeUserId('3'), message: 'user not found' },
      { id: makeUserId('5'), message: 'archive service failed' },
      { id: makeUserId('6'), message: 'archive failed' },
    ])
    expect(context.dataSources.userService.archive).toHaveBeenCalledTimes(4)
    expect(
      context.dataSources.queues.userQueue.archiveUser
    ).toHaveBeenCalledWith({ userId: '1' })
    expect(
      context.dataSources.queues.userQueue.archiveUser
    ).toHaveBeenCalledWith({ userId: '4' })
    expect(
      context.dataSources.notificationService.mail.sendUserDeletedByAdmin
    ).toHaveBeenCalledTimes(1)
    expect(
      context.dataSources.notificationService.mail.sendUserDeletedByAdmin
    ).toHaveBeenCalledWith({
      to: 'archive-user-4@matters.news',
      recipient: { displayName: 'Archive User 4' },
      language: 'zh_hant',
    })
  })
})
