import { jest } from '@jest/globals'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import { moderationCases } from '../user/oss.js'
import { user } from '../system/oss/users.js'

describe('OSS user review queries', () => {
  test('looks up users by email, Matters ID, or global ID', async () => {
    const emailUser = { id: '1', email: 'person@example.com' }
    const namedUser = { id: '2', userName: 'person' }
    const idUser = { id: '3' }
    const findByEmail = jest.fn<any>().mockResolvedValue(emailUser)
    const findByUserName = jest.fn<any>().mockResolvedValue(namedUser)
    const load = jest.fn<any>().mockResolvedValue(idUser)
    const context = {
      dataSources: {
        atomService: { userIdLoader: { load } },
        userService: { findByEmail, findByUserName },
      },
    }

    await expect(
      (user as any)(null, { input: { email: 'PERSON@example.com' } }, context)
    ).resolves.toBe(emailUser)
    expect(findByEmail).toHaveBeenCalledWith('person@example.com')

    await expect(
      (user as any)(null, { input: { userName: 'Person' } }, context)
    ).resolves.toBe(namedUser)
    expect(findByUserName).toHaveBeenCalledWith('Person', true)

    const id = toGlobalId({ type: NODE_TYPES.User, id: '3' })
    await expect((user as any)(null, { input: { id } }, context)).resolves.toBe(
      idUser
    )
    expect(load).toHaveBeenCalledWith('3')
  })

  test('requires exactly one lookup identifier', async () => {
    const context = {
      dataSources: {
        atomService: { userIdLoader: { load: jest.fn() } },
        userService: {
          findByEmail: jest.fn(),
          findByUserName: jest.fn(),
        },
      },
    }

    await expect(
      (user as any)(null, { input: {} }, context)
    ).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    })
    await expect(
      (user as any)(
        null,
        { input: { email: 'person@example.com', userName: 'person' } },
        context
      )
    ).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    })
  })

  test('returns account moderation cases in newest-first order', async () => {
    const moderationCase = {
      id: '9',
      targetType: 'user',
      targetId: '3',
      createdAt: new Date(),
    }
    const baseCount = jest.fn<any>().mockResolvedValue(1)
    const baseFind = jest.fn<any>().mockResolvedValue([moderationCase])
    const context = {
      dataSources: {
        systemService: { baseCount, baseFind },
      },
    }

    const connection = await (moderationCases as any)(
      { id: '3' },
      { input: { first: 20 } },
      context
    )

    expect(baseCount).toHaveBeenCalledWith(
      { targetType: 'user', targetId: '3' },
      'moderation_case'
    )
    expect(baseFind).toHaveBeenCalledWith(
      expect.objectContaining({
        table: 'moderation_case',
        where: { targetType: 'user', targetId: '3' },
        orderBy: [{ column: 'createdAt', order: 'desc' }],
      })
    )
    expect(connection.totalCount).toBe(1)
    expect(connection.edges[0].node).toBe(moderationCase)
  })
})
