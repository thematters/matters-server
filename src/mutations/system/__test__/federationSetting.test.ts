import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import { jest } from '@jest/globals'

import setArticleFederationSetting from '../../article/setArticleFederationSetting.js'
import setViewerFederationSetting from '../../user/setViewerFederationSetting.js'
import putArticleFederationSetting from '../putArticleFederationSetting.js'
import putUserFederationSetting from '../putUserFederationSetting.js'

describe('federation setting mutations', () => {
  test('upserts author federation setting with global IDs', async () => {
    const upsertAuthorFederationSetting = jest.fn(async () => ({
      userId: '2',
      state: 'enabled',
      updatedBy: '9',
    }))

    const result = await (putUserFederationSetting as any)(
      {},
      {
        input: {
          id: toGlobalId({ type: NODE_TYPES.User, id: '2' }),
          state: 'enabled',
        },
      },
      {
        viewer: { id: '9' },
        dataSources: {
          federationExportService: { upsertAuthorFederationSetting },
        },
      }
    )

    expect(upsertAuthorFederationSetting).toHaveBeenCalledWith({
      userId: '2',
      state: 'enabled',
      updatedBy: '9',
    })
    expect(result).toEqual({
      userId: toGlobalId({ type: NODE_TYPES.User, id: '2' }),
      state: 'enabled',
      updatedBy: toGlobalId({ type: NODE_TYPES.User, id: '9' }),
    })
  })

  test('upserts article federation setting with global IDs', async () => {
    const upsertArticleFederationSetting = jest.fn(async () => ({
      articleId: '1',
      state: 'disabled',
      updatedBy: '9',
    }))

    const result = await (putArticleFederationSetting as any)(
      {},
      {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Article, id: '1' }),
          state: 'disabled',
        },
      },
      {
        viewer: { id: '9' },
        dataSources: {
          federationExportService: { upsertArticleFederationSetting },
        },
      }
    )

    expect(upsertArticleFederationSetting).toHaveBeenCalledWith({
      articleId: '1',
      state: 'disabled',
      updatedBy: '9',
    })
    expect(result).toEqual({
      articleId: toGlobalId({ type: NODE_TYPES.Article, id: '1' }),
      state: 'disabled',
      updatedBy: toGlobalId({ type: NODE_TYPES.User, id: '9' }),
    })
  })

  test('rejects IDs for the wrong node type', async () => {
    await expect(
      (putUserFederationSetting as any)(
        {},
        {
          input: {
            id: toGlobalId({ type: NODE_TYPES.Article, id: '1' }),
            state: 'enabled',
          },
        },
        {
          viewer: { id: '9' },
          dataSources: {
            federationExportService: {
              upsertAuthorFederationSetting: jest.fn(),
            },
          },
        }
      )
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } })

    await expect(
      (putArticleFederationSetting as any)(
        {},
        {
          input: {
            id: toGlobalId({ type: NODE_TYPES.User, id: '2' }),
            state: 'disabled',
          },
        },
        {
          viewer: { id: '9' },
          dataSources: {
            federationExportService: {
              upsertArticleFederationSetting: jest.fn(),
            },
          },
        }
      )
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } })
  })

  test('lets Fediverse beta viewers update their own author setting', async () => {
    const upsertAuthorFederationSetting = jest.fn(async () => ({
      userId: '9',
      state: 'enabled',
      updatedBy: '9',
    }))

    const result = await (setViewerFederationSetting as any)(
      {},
      { input: { state: 'enabled' } },
      {
        viewer: { id: '9' },
        dataSources: {
          federationExportService: { upsertAuthorFederationSetting },
          userService: {
            findFeatureFlags: jest.fn(async () => [{ type: 'fediverseBeta' }]),
            validateUserState: jest.fn(),
          },
        },
      }
    )

    expect(upsertAuthorFederationSetting).toHaveBeenCalledWith({
      userId: '9',
      state: 'enabled',
      updatedBy: '9',
    })
    expect(result).toEqual({
      userId: toGlobalId({ type: NODE_TYPES.User, id: '9' }),
      state: 'enabled',
      updatedBy: toGlobalId({ type: NODE_TYPES.User, id: '9' }),
    })
  })

  test('requires Fediverse beta flag for viewer author setting', async () => {
    await expect(
      (setViewerFederationSetting as any)(
        {},
        { input: { state: 'enabled' } },
        {
          viewer: { id: '9' },
          dataSources: {
            federationExportService: {
              upsertAuthorFederationSetting: jest.fn(),
            },
            userService: {
              findFeatureFlags: jest.fn(async () => []),
              validateUserState: jest.fn(),
            },
          },
        }
      )
    ).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } })
  })

  test('lets Fediverse beta authors update their own article setting', async () => {
    const upsertArticleFederationSetting = jest.fn(async () => ({
      articleId: '101',
      state: 'disabled',
      updatedBy: '9',
    }))

    const result = await (setArticleFederationSetting as any)(
      {},
      {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Article, id: '101' }),
          state: 'disabled',
        },
      },
      {
        viewer: { id: '9' },
        dataSources: {
          articleService: {
            baseFindById: jest.fn(async () => ({ authorId: '9' })),
          },
          federationExportService: { upsertArticleFederationSetting },
          userService: {
            findFeatureFlags: jest.fn(async () => [{ type: 'fediverseBeta' }]),
            validateUserState: jest.fn(),
          },
        },
      }
    )

    expect(upsertArticleFederationSetting).toHaveBeenCalledWith({
      articleId: '101',
      state: 'disabled',
      updatedBy: '9',
    })
    expect(result).toEqual({
      articleId: toGlobalId({ type: NODE_TYPES.Article, id: '101' }),
      state: 'disabled',
      updatedBy: toGlobalId({ type: NODE_TYPES.User, id: '9' }),
    })
  })

  test('rejects article setting updates by non-authors', async () => {
    await expect(
      (setArticleFederationSetting as any)(
        {},
        {
          input: {
            id: toGlobalId({ type: NODE_TYPES.Article, id: '101' }),
            state: 'disabled',
          },
        },
        {
          viewer: { id: '9' },
          dataSources: {
            articleService: {
              baseFindById: jest.fn(async () => ({ authorId: '8' })),
            },
            federationExportService: {
              upsertArticleFederationSetting: jest.fn(),
            },
            userService: {
              findFeatureFlags: jest.fn(async () => [
                { type: 'fediverseBeta' },
              ]),
              validateUserState: jest.fn(),
            },
          },
        }
      )
    ).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } })
  })
})
