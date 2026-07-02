import { UserInputError } from '#common/errors.js'

import putMoment from '../putMoment.js'

describe('putMoment mutation', () => {
  test('rejects more than the max number of tags', async () => {
    const context = {
      viewer: { id: '1' },
      dataSources: {
        connections: { redis: {} },
      },
    }
    await expect(
      (putMoment as any)(
        {},
        { input: { content: 'test', tags: ['a', 'b', 'c', 'd'] } },
        context
      )
    ).rejects.toThrowError(UserInputError)
  })
})
