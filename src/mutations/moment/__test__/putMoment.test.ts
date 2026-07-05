import { UserInputError } from '#common/errors.js'

import putMoment from '../putMoment.js'

describe('putMoment mutation', () => {
  const context = {
    viewer: { id: '1' },
    dataSources: {
      connections: { redis: {} },
    },
  }

  test('rejects more than the max number of tags', async () => {
    await expect(
      (putMoment as any)(
        {},
        { input: { content: 'test', tags: ['a', 'b', 'c', 'd'] } },
        context
      )
    ).rejects.toThrowError(UserInputError)
  })

  test('rejects tags-only moment without content and assets', async () => {
    await expect(
      (putMoment as any)({}, { input: { content: '', tags: ['a'] } }, context)
    ).rejects.toThrowError(UserInputError)
  })
})
