import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import {
  ARTICLE_ACCESS_TYPE,
  ARTICLE_STATE,
  USER_STATE,
} from '#common/enums/index.js'
import { jest } from '@jest/globals'

import articleFederationEligibility from '../article/federationEligibility.js'
import articleFederationSetting from '../article/federationSetting.js'
import userFederationSetting from '../user/federationSetting.js'

describe('federation setting query resolvers', () => {
  test('resolves author federation setting with global IDs', async () => {
    const loadAuthorFederationSetting = jest.fn(async () => ({
      userId: '2',
      state: 'enabled',
      updatedBy: '9',
    }))

    const result = await (userFederationSetting as any)(
      { id: '2' },
      {},
      {
        dataSources: {
          federationExportService: { loadAuthorFederationSetting },
        },
      }
    )

    expect(loadAuthorFederationSetting).toHaveBeenCalledWith('2')
    expect(result).toEqual({
      userId: toGlobalId({ type: NODE_TYPES.User, id: '2' }),
      state: 'enabled',
      updatedBy: toGlobalId({ type: NODE_TYPES.User, id: '9' }),
    })
  })

  test('resolves article federation setting with global IDs', async () => {
    const loadArticleFederationSetting = jest.fn(async () => ({
      articleId: '101',
      state: 'disabled',
      updatedBy: null,
    }))

    const result = await (articleFederationSetting as any)(
      { id: '101' },
      {},
      {
        dataSources: {
          federationExportService: { loadArticleFederationSetting },
        },
      }
    )

    expect(loadArticleFederationSetting).toHaveBeenCalledWith('101')
    expect(result).toEqual({
      articleId: toGlobalId({ type: NODE_TYPES.Article, id: '101' }),
      state: 'disabled',
      updatedBy: null,
    })
  })

  test('resolves article federation eligibility from server gate', async () => {
    const loadSelectedArticleRows = jest.fn(async () => [
      {
        articleId: '101',
        articleState: ARTICLE_STATE.active,
        title: '公開長文',
        summary: '摘要',
        content: '<p>內容</p>',
        access: ARTICLE_ACCESS_TYPE.public,
        createdAt: new Date('2026-05-11T00:00:00.000Z'),
        federationSetting: 'inherit',
        author: {
          id: '2',
          userName: 'mashbean',
          displayName: 'Mashbean',
          state: USER_STATE.active,
          federationSetting: 'enabled',
        },
      },
    ])

    const result = await (articleFederationEligibility as any)(
      { id: '101' },
      {},
      {
        dataSources: {
          federationExportService: { loadSelectedArticleRows },
        },
      }
    )

    expect(loadSelectedArticleRows).toHaveBeenCalledWith(['101'], {
      includeFederationSettings: true,
    })
    expect(result).toMatchObject({
      eligible: true,
      reason: 'eligible',
      effectiveArticleSetting: 'inherit',
    })
  })
})
