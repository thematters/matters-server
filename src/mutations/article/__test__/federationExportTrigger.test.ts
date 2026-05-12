import { jest } from '@jest/globals'

import {
  ARTICLE_ACCESS_TYPE,
  ARTICLE_LICENSE_TYPE,
  ARTICLE_STATE,
  NODE_TYPES,
  PUBLISH_STATE,
  USER_STATE,
} from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import { toGlobalId } from '#common/utils/index.js'
import { FEDERATION_EXPORT_TRIGGER_MODE } from '#connectors/article/federationExportService.js'

import editArticle from '../editArticle.js'
import publishArticle from '../publishArticle.js'

const editArticleResolver = editArticle as any
const publishArticleResolver = publishArticle as any

const viewer = {
  id: '1',
  state: USER_STATE.active,
  userName: 'mashbean',
}

const createDraft = () => ({
  id: '10',
  authorId: viewer.id,
  archived: false,
  title: 'Federation staging article',
  content: '<p>public body</p>',
  circleId: null,
  campaigns: [],
  collections: null,
  connections: null,
  publishState: PUBLISH_STATE.unpublished,
})

describe('article federation export trigger scaffold', () => {
  afterEach(() => {
    environment.federationExportTriggerMode = FEDERATION_EXPORT_TRIGGER_MODE.off
    jest.clearAllMocks()
  })

  test('publishArticle records the strict export decision in record-only mode without blocking publish errors', async () => {
    environment.federationExportTriggerMode =
      FEDERATION_EXPORT_TRIGGER_MODE.recordOnly

    const publishedDraft = { ...createDraft(), articleId: '101' }
    const federationExportService = {
      recordExportTriggerDecision: (jest.fn() as any).mockRejectedValue(
        new Error('audit storage unavailable')
      ),
    }
    const context = {
      viewer,
      dataSources: {
        atomService: {
          draftIdLoader: {
            load: (jest.fn() as any).mockResolvedValue(createDraft()),
          },
          update: (jest.fn() as any).mockResolvedValue(createDraft()),
          findFirst: jest.fn(),
        },
        publicationService: {
          publishArticle: (jest.fn() as any).mockResolvedValue(publishedDraft),
        },
        collectionService: {
          validateCollection: jest.fn(),
        },
        federationExportService,
      },
    }

    const result = await publishArticleResolver(
      null as any,
      {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Draft, id: '10' }),
          iscnPublish: false,
        },
      } as any,
      context as any,
      null as any
    )

    expect(result).toBe(publishedDraft)
    expect(
      federationExportService.recordExportTriggerDecision
    ).toHaveBeenCalledWith({
      articleId: '101',
      actorId: viewer.id,
      trigger: 'publish_article',
    })
  })

  test('editArticle records the strict export decision for content revisions in record-only mode without blocking edits', async () => {
    environment.federationExportTriggerMode =
      FEDERATION_EXPORT_TRIGGER_MODE.recordOnly

    const article = {
      id: '101',
      authorId: viewer.id,
      state: ARTICLE_STATE.active,
      revisionCount: 0,
    }
    const articleVersion = {
      id: '201',
      title: 'Old title',
      summary: 'Old summary',
      cover: null,
      tags: [],
      connections: [],
      access: ARTICLE_ACCESS_TYPE.public,
      license: ARTICLE_LICENSE_TYPE.arr,
    }
    const federationExportService = {
      recordExportTriggerDecision: (jest.fn() as any).mockRejectedValue(
        new Error('audit storage unavailable')
      ),
    }
    const revisionQueue = {
      publishRevisedArticle: jest.fn(),
    }
    const articleService = {
      validateArticle: (jest.fn() as any).mockResolvedValue([
        article,
        articleVersion,
      ]),
      loadLatestArticleContent: (jest.fn() as any).mockResolvedValue(
        '<p>old</p>'
      ),
      latestArticleVersionLoader: {
        clearAll: jest.fn(),
      },
    }
    const atomService = {
      update: (jest.fn() as any).mockResolvedValue(article),
      findUnique: (jest.fn() as any).mockResolvedValue(article),
    }
    const context = {
      viewer,
      dataSources: {
        userService: {
          validateUserState: jest.fn(),
        },
        articleService,
        publicationService: {
          createNewArticleVersion: (jest.fn() as any).mockResolvedValue({
            id: '202',
          }),
        },
        atomService,
        systemService: {},
        campaignService: {},
        collectionService: {},
        federationExportService,
        queues: { revisionQueue },
        connections: { redis: {} },
      },
    }

    const result = await editArticleResolver(
      null as any,
      {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Article, id: article.id }),
          content: '<p>new public body</p>',
        },
      } as any,
      context as any,
      null as any
    )

    expect(result).toBe(article)
    expect(revisionQueue.publishRevisedArticle).toHaveBeenCalledWith({
      articleId: article.id,
      newArticleVersionId: '202',
      oldArticleVersionId: articleVersion.id,
    })
    expect(
      federationExportService.recordExportTriggerDecision
    ).toHaveBeenCalledWith({
      articleId: article.id,
      actorId: viewer.id,
      trigger: 'revise_article',
    })
  })
})
