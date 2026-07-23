import { NODE_TYPES } from '#common/enums/index.js'
import {
  ArticleNotFoundError,
  ForbiddenError,
  UserInputError,
} from '#common/errors.js'
import { toGlobalId } from '#common/utils/index.js'
import { jest } from '@jest/globals'

import fediverseArticle from '../fediverse/fediverseArticle.js'
import fediverseRemoteActor from '../fediverse/fediverseRemoteActor.js'
import viewerFediverse from '../fediverse/viewerFediverse.js'

const createEnabledContext = ({
  viewer = { id: '2', userName: 'mashbean' },
  federationOverrides = {},
}: {
  viewer?: { id?: string | null; userName?: string | null }
  federationOverrides?: Record<string, unknown>
} = {}) => {
  const validateUserState = jest.fn()
  const loadAuthorFederationSetting = jest.fn(async () => ({
    state: 'enabled',
  }))
  const federationExportService = {
    loadAuthorFederationSetting,
    ...federationOverrides,
  }

  return {
    context: {
      viewer,
      dataSources: {
        userService: { validateUserState },
        federationExportService,
      },
    },
    federationExportService,
    loadAuthorFederationSetting,
    validateUserState,
  }
}

describe('Fediverse social queries', () => {
  test('loads the enabled viewer social profile', async () => {
    const loadSocialProfile = jest.fn(async () => ({
      handle: 'mashbean',
      followersCount: 3,
    }))
    const { context, validateUserState, loadAuthorFederationSetting } =
      createEnabledContext({
        federationOverrides: { loadSocialProfile },
      })

    await expect((viewerFediverse as any)(null, {}, context)).resolves.toEqual({
      handle: 'mashbean',
      followersCount: 3,
    })
    expect(validateUserState).toHaveBeenCalledWith(context.viewer)
    expect(loadAuthorFederationSetting).toHaveBeenCalledWith('2')
    expect(loadSocialProfile).toHaveBeenCalledWith('mashbean')
  })

  test('rejects viewers without a username or enabled publishing', async () => {
    const missingUsername = createEnabledContext({
      viewer: { id: '2', userName: null },
    })
    await expect(
      (viewerFediverse as any)(null, {}, missingUsername.context)
    ).rejects.toThrow(ForbiddenError)

    const disabled = createEnabledContext()
    disabled.loadAuthorFederationSetting.mockResolvedValue({
      state: 'disabled',
    })
    await expect(
      (viewerFediverse as any)(null, {}, disabled.context)
    ).rejects.toThrow('Enable Fediverse publishing before using it')
  })

  test('resolves remote actors by account or actor ID', async () => {
    const resolveSocialRemoteActor = jest.fn(async () => ({
      actorId: 'https://social.example/users/alice',
      account: 'alice@social.example',
    }))
    const { context } = createEnabledContext({
      federationOverrides: { resolveSocialRemoteActor },
    })

    await expect(
      (fediverseRemoteActor as any)(
        null,
        { input: { account: '@alice@social.example', actorId: null } },
        context
      )
    ).resolves.toMatchObject({
      account: 'alice@social.example',
    })
    expect(resolveSocialRemoteActor).toHaveBeenCalledWith({
      account: '@alice@social.example',
      actorId: null,
    })

    await expect(
      (fediverseRemoteActor as any)(
        null,
        { input: { account: null, actorId: null } },
        context
      )
    ).rejects.toThrow(UserInputError)
  })

  test('loads social interactions only for the article author', async () => {
    const loadSelectedArticleRows = jest.fn(async () => [
      {
        articleId: '101',
        shortHash: 'abc123',
        author: { id: '2' },
      },
    ])
    const loadArticleSocial = jest.fn(async () => ({
      contentId: 'article-101',
      likesCount: 2,
    }))
    const { context } = createEnabledContext({
      federationOverrides: {
        loadSelectedArticleRows,
        loadArticleSocial,
      },
    })

    const result = await (fediverseArticle as any)(
      null,
      {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Article, id: '101' }),
        },
      },
      context
    )

    expect(loadSelectedArticleRows).toHaveBeenCalledWith(['101'])
    expect(loadArticleSocial).toHaveBeenCalledWith({
      actorHandle: 'mashbean',
      contentRef: expect.stringMatching(/\/a\/abc123$/),
    })
    expect(result).toEqual({
      contentId: 'article-101',
      likesCount: 2,
    })
  })

  test('rejects invalid, missing, or foreign articles', async () => {
    const loadSelectedArticleRows = jest.fn(
      async (): Promise<Array<Record<string, unknown>>> => []
    )
    const { context } = createEnabledContext({
      federationOverrides: {
        loadSelectedArticleRows,
        loadArticleSocial: jest.fn(),
      },
    })

    await expect(
      (fediverseArticle as any)(
        null,
        {
          input: {
            id: toGlobalId({ type: NODE_TYPES.User, id: '101' }),
          },
        },
        context
      )
    ).rejects.toThrow(UserInputError)

    loadSelectedArticleRows.mockResolvedValueOnce([])
    await expect(
      (fediverseArticle as any)(
        null,
        {
          input: {
            id: toGlobalId({ type: NODE_TYPES.Article, id: '404' }),
          },
        },
        context
      )
    ).rejects.toThrow(ArticleNotFoundError)

    loadSelectedArticleRows.mockResolvedValueOnce([
      {
        articleId: '101',
        shortHash: 'abc123',
        author: { id: '9' },
      },
    ])
    await expect(
      (fediverseArticle as any)(
        null,
        {
          input: {
            id: toGlobalId({ type: NODE_TYPES.Article, id: '101' }),
          },
        },
        context
      )
    ).rejects.toThrow(ForbiddenError)
  })
})
