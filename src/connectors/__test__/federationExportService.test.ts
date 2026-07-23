import {
  ARTICLE_ACCESS_TYPE,
  ARTICLE_STATE,
  QUEUE_URL,
  USER_STATE,
} from '#common/enums/index.js'
import { jest } from '@jest/globals'
import {
  buildMattersArticleUrl,
  evaluateFederationExportRows,
  FEDERATION_ARTICLE_SETTING,
  FEDERATION_AUTHOR_SETTING,
  FEDERATION_EXPORT_TRIGGER,
  FEDERATION_EXPORT_ACTION,
  FEDERATION_EXPORT_TRIGGER_MODE,
  FederationExportService,
  isFederationPublicArticleRow,
  FederationExportArticleRow,
  resolveFederationExportGate,
  resolveFederationExportGateForRow,
} from '#connectors/article/federationExportService.js'

const publicRow = (
  overrides: Partial<FederationExportArticleRow> = {}
): FederationExportArticleRow => ({
  articleId: '101',
  articleState: ARTICLE_STATE.active,
  shortHash: 'abc123',
  title: '公開長文',
  summary: '一篇公開長文摘要',
  content: '<p>公開內容</p>',
  tags: ['Fediverse'],
  access: ARTICLE_ACCESS_TYPE.public,
  createdAt: new Date('2026-05-02T00:00:00.000Z'),
  updatedAt: new Date('2026-05-02T01:00:00.000Z'),
  author: {
    id: '1',
    userName: 'mashbean',
    displayName: 'Mashbean',
    description: 'Matters author',
    state: USER_STATE.active,
    ipnsKey: 'k51example',
  },
  ...overrides,
})

const createKnexRO = (rows: any[]) => {
  const query: any = {
    join: jest.fn(() => query),
    leftJoin: jest.fn(() => query),
    whereIn: jest.fn(() => query),
    select: jest.fn(() => query),
    then: (
      resolve: (value: any[]) => unknown,
      reject: (error: unknown) => unknown
    ) => Promise.resolve(rows).then(resolve, reject),
  }
  const knexRO = jest.fn(() => query)

  return { knexRO, query }
}

const createKnexWrite = (rows: any[]) => {
  const query: any = {
    insert: jest.fn(() => query),
    onConflict: jest.fn(() => query),
    merge: jest.fn(() => query),
    returning: jest.fn(() => Promise.resolve(rows)),
  }
  const knex = jest.fn(() => query) as any
  knex.fn = {
    now: jest.fn(() => 'now'),
  }

  return { knex, query }
}

const createKnexInsert = (rows: any[]) => {
  const query: any = {
    insert: jest.fn(() => query),
    returning: jest.fn(() => Promise.resolve(rows)),
  }
  const knex = jest.fn(() => query) as any

  return { knex, query }
}

const createKnexFirst = (row: any) => {
  const query: any = {
    where: jest.fn(() => query),
    first: jest.fn(() => Promise.resolve(row)),
  }
  const knexRO = jest.fn(() => query)

  return { knexRO, query }
}

describe('federationExportService', () => {
  test('builds canonical Matters article URLs from short hashes', () => {
    expect(
      buildMattersArticleUrl({
        siteDomain: 'matters.town',
        articleId: '101',
        shortHash: 'abc123',
      })
    ).toBe('https://matters.town/a/abc123')

    expect(
      buildMattersArticleUrl({
        siteDomain: 'matters.town',
        articleId: '101',
      })
    ).toBe('https://matters.town/a/101')
  })

  test('accepts only active public articles with usable author identity', () => {
    expect(isFederationPublicArticleRow(publicRow())).toBe(true)
    expect(
      isFederationPublicArticleRow(
        publicRow({ access: ARTICLE_ACCESS_TYPE.paywall })
      )
    ).toBe(false)
    expect(
      isFederationPublicArticleRow(
        publicRow({ articleState: ARTICLE_STATE.archived })
      )
    ).toBe(false)
    expect(
      isFederationPublicArticleRow(
        publicRow({
          author: { ...publicRow().author, state: USER_STATE.archived },
        })
      )
    ).toBe(false)
    expect(
      isFederationPublicArticleRow(
        publicRow({
          author: { ...publicRow().author, userName: null },
        })
      )
    ).toBe(false)
    expect(
      isFederationPublicArticleRow(
        publicRow({
          author: { ...publicRow().author, displayName: null },
        })
      )
    ).toBe(false)
  })

  test('requires explicit author opt-in before a public article can federate', () => {
    expect(
      resolveFederationExportGate({
        row: publicRow(),
        authorSetting: FEDERATION_AUTHOR_SETTING.enabled,
      })
    ).toEqual({
      eligible: true,
      reason: 'eligible',
      effectiveArticleSetting: FEDERATION_ARTICLE_SETTING.inherit,
    })

    expect(
      resolveFederationExportGate({
        row: publicRow(),
        authorSetting: FEDERATION_AUTHOR_SETTING.disabled,
      }).reason
    ).toBe('author_not_opted_in')

    expect(
      resolveFederationExportGate({
        row: publicRow(),
        authorSetting: FEDERATION_AUTHOR_SETTING.enabled,
        articleSetting: FEDERATION_ARTICLE_SETTING.disabled,
      }).reason
    ).toBe('article_disabled')
  })

  test('does not let federation settings override the public-only boundary', () => {
    expect(
      resolveFederationExportGate({
        row: publicRow({ access: ARTICLE_ACCESS_TYPE.paywall }),
        authorSetting: FEDERATION_AUTHOR_SETTING.enabled,
        articleSetting: FEDERATION_ARTICLE_SETTING.enabled,
      }).reason
    ).toBe('article_not_public')

    expect(
      resolveFederationExportGate({
        row: publicRow({ articleState: ARTICLE_STATE.archived }),
        authorSetting: FEDERATION_AUTHOR_SETTING.enabled,
      }).reason
    ).toBe('article_not_public')
  })

  test('can resolve the gate from row-level contract fields', () => {
    expect(
      resolveFederationExportGateForRow(
        publicRow({
          federationSetting: FEDERATION_ARTICLE_SETTING.inherit,
          author: {
            ...publicRow().author,
            federationSetting: FEDERATION_AUTHOR_SETTING.enabled,
          },
        })
      ).eligible
    ).toBe(true)
  })

  test('reports selected, eligible, and skipped rows for auditability', () => {
    const report = evaluateFederationExportRows({
      rows: [
        publicRow({
          author: {
            ...publicRow().author,
            federationSetting: FEDERATION_AUTHOR_SETTING.enabled,
          },
        }),
        publicRow({
          articleId: '102',
          federationSetting: FEDERATION_ARTICLE_SETTING.disabled,
          author: {
            ...publicRow().author,
            federationSetting: FEDERATION_AUTHOR_SETTING.enabled,
          },
        }),
        publicRow({ articleId: '103', access: ARTICLE_ACCESS_TYPE.paywall }),
      ],
      enforceFederationGate: true,
    })

    expect(report.selected).toBe(3)
    expect(report.eligible).toBe(1)
    expect(report.skipped).toBe(2)
    expect(report.decisions.map((decision) => decision.reason)).toEqual([
      'eligible',
      'article_disabled',
      'article_not_public',
    ])
  })

  test('reports the default public-only preflight gate without strict opt-in', () => {
    const report = evaluateFederationExportRows({
      rows: [
        publicRow(),
        publicRow({
          articleId: '102',
          access: ARTICLE_ACCESS_TYPE.paywall,
          federationSetting: FEDERATION_ARTICLE_SETTING.enabled,
        }),
      ],
    })

    expect(report.enforceFederationGate).toBe(false)
    expect(report.selected).toBe(2)
    expect(report.eligible).toBe(1)
    expect(report.skipped).toBe(1)
    expect(report.decisions).toEqual([
      expect.objectContaining({
        articleId: '101',
        eligible: true,
        reason: 'eligible',
        articleSetting: null,
      }),
      expect.objectContaining({
        articleId: '102',
        eligible: false,
        reason: 'article_not_public',
        articleSetting: FEDERATION_ARTICLE_SETTING.enabled,
      }),
    ])
  })

  test('loads selected article rows from read-only DB without federation setting joins by default', async () => {
    const { knexRO, query } = createKnexRO([
      {
        articleId: '102',
        articleState: ARTICLE_STATE.active,
        shortHash: 'def456',
        title: '第二篇',
        summary: '第二篇摘要',
        content: '<p>第二篇內容</p>',
        tags: null,
        access: ARTICLE_ACCESS_TYPE.public,
        circleId: null,
        createdAt: new Date('2026-05-02T03:00:00.000Z'),
        updatedAt: new Date('2026-05-02T04:00:00.000Z'),
        authorId: '1',
        userName: 'mashbean',
        displayName: 'Mashbean',
        authorDescription: 'Matters author',
        authorState: USER_STATE.active,
        ipnsKey: 'k51example',
      },
      {
        articleId: '101',
        articleState: ARTICLE_STATE.active,
        shortHash: 'abc123',
        title: '第一篇',
        summary: '第一篇摘要',
        content: '<p>第一篇內容</p>',
        tags: ['Fediverse'],
        access: ARTICLE_ACCESS_TYPE.public,
        circleId: null,
        createdAt: new Date('2026-05-02T00:00:00.000Z'),
        updatedAt: null,
        authorId: '1',
        userName: 'mashbean',
        displayName: 'Mashbean',
        authorDescription: 'Matters author',
        authorState: USER_STATE.active,
        ipnsKey: null,
      },
    ])
    const service = new FederationExportService({ knexRO } as any)

    const rows = await service.loadSelectedArticleRows(['101', '102'])

    expect(knexRO).toHaveBeenCalledWith('article')
    expect(query.whereIn).toHaveBeenCalledWith('article.id', ['101', '102'])
    expect(query.leftJoin).toHaveBeenCalledTimes(3)
    expect(query.leftJoin).toHaveBeenCalledWith('user_ipns_keys as ipnsKey', {
      'ipnsKey.userId': 'author.id',
    })
    expect(query.leftJoin).toHaveBeenCalledWith('asset as authorAvatar', {
      'authorAvatar.id': 'author.avatar',
    })
    expect(query.leftJoin).toHaveBeenCalledWith('asset as authorProfileCover', {
      'authorProfileCover.id': 'author.profileCover',
    })
    expect(rows.map((row) => row.articleId)).toEqual(['101', '102'])
    expect(rows[0]).toMatchObject({
      articleId: '101',
      tags: ['Fediverse'],
      federationSetting: undefined,
      author: {
        id: '1',
        userName: 'mashbean',
        displayName: 'Mashbean',
        federationSetting: undefined,
      },
    })
    expect(rows[1].tags).toEqual([])
  })

  test('loads federation setting columns only when strict gate input is requested', async () => {
    const { knexRO, query } = createKnexRO([
      {
        articleId: '101',
        articleState: ARTICLE_STATE.active,
        shortHash: 'abc123',
        title: '公開長文',
        summary: '一篇公開長文摘要',
        content: '<p>公開內容</p>',
        tags: ['Fediverse'],
        access: ARTICLE_ACCESS_TYPE.public,
        circleId: null,
        createdAt: new Date('2026-05-02T00:00:00.000Z'),
        updatedAt: new Date('2026-05-02T01:00:00.000Z'),
        authorId: '1',
        userName: 'mashbean',
        displayName: 'Mashbean',
        authorDescription: 'Matters author',
        authorState: USER_STATE.active,
        ipnsKey: 'k51example',
        authorFederationSetting: FEDERATION_AUTHOR_SETTING.enabled,
        articleFederationSetting: FEDERATION_ARTICLE_SETTING.inherit,
      },
    ])
    const service = new FederationExportService({ knexRO } as any)

    const rows = await service.loadSelectedArticleRows(['101'], {
      includeFederationSettings: true,
    })

    expect(query.leftJoin).toHaveBeenCalledWith(
      'user_federation_setting as authorFederation',
      {
        'authorFederation.userId': 'author.id',
      }
    )
    expect(query.leftJoin).toHaveBeenCalledWith(
      'article_federation_setting as articleFederation',
      {
        'articleFederation.articleId': 'article.id',
      }
    )
    expect(rows[0].author.federationSetting).toBe(
      FEDERATION_AUTHOR_SETTING.enabled
    )
    expect(rows[0].federationSetting).toBe(FEDERATION_ARTICLE_SETTING.inherit)
  })

  test('requires explicit article IDs for DB-backed federation export', async () => {
    const { knexRO } = createKnexRO([])
    const service = new FederationExportService({ knexRO } as any)

    await expect(service.loadSelectedArticleRows([])).rejects.toThrow(
      'Explicit articleIds are required'
    )
    expect(knexRO).not.toHaveBeenCalled()
  })

  test('upserts author federation settings through the write connection', async () => {
    const { knex, query } = createKnexWrite([
      {
        userId: '1',
        state: FEDERATION_AUTHOR_SETTING.enabled,
        updatedBy: '99',
      },
    ])
    const service = new FederationExportService({ knex } as any)

    const row = await service.upsertAuthorFederationSetting({
      userId: '1',
      state: FEDERATION_AUTHOR_SETTING.enabled,
      updatedBy: '99',
    })

    expect(knex).toHaveBeenCalledWith('user_federation_setting')
    expect(query.insert).toHaveBeenCalledWith({
      userId: '1',
      state: FEDERATION_AUTHOR_SETTING.enabled,
      updatedBy: '99',
    })
    expect(query.onConflict).toHaveBeenCalledWith('userId')
    expect(query.merge).toHaveBeenCalledWith({
      state: FEDERATION_AUTHOR_SETTING.enabled,
      updatedBy: '99',
      updatedAt: 'now',
    })
    expect(query.returning).toHaveBeenCalledWith([
      'userId',
      'state',
      'updatedBy',
    ])
    expect(row).toEqual({
      userId: '1',
      state: FEDERATION_AUTHOR_SETTING.enabled,
      updatedBy: '99',
    })
  })

  test('upserts article federation settings through the write connection', async () => {
    const { knex, query } = createKnexWrite([
      {
        articleId: '101',
        state: FEDERATION_ARTICLE_SETTING.disabled,
        updatedBy: null,
      },
    ])
    const service = new FederationExportService({ knex } as any)

    const row = await service.upsertArticleFederationSetting({
      articleId: '101',
      state: FEDERATION_ARTICLE_SETTING.disabled,
    })

    expect(knex).toHaveBeenCalledWith('article_federation_setting')
    expect(query.insert).toHaveBeenCalledWith({
      articleId: '101',
      state: FEDERATION_ARTICLE_SETTING.disabled,
      updatedBy: null,
    })
    expect(query.onConflict).toHaveBeenCalledWith('articleId')
    expect(query.merge).toHaveBeenCalledWith({
      state: FEDERATION_ARTICLE_SETTING.disabled,
      updatedBy: null,
      updatedAt: 'now',
    })
    expect(query.returning).toHaveBeenCalledWith([
      'articleId',
      'state',
      'updatedBy',
    ])
    expect(row).toEqual({
      articleId: '101',
      state: FEDERATION_ARTICLE_SETTING.disabled,
      updatedBy: null,
    })
  })

  test('loads author federation setting from read-only DB', async () => {
    const { knexRO, query } = createKnexFirst({
      userId: '1',
      state: FEDERATION_AUTHOR_SETTING.enabled,
      updatedBy: '99',
    })
    const service = new FederationExportService({ knexRO } as any)

    const row = await service.loadAuthorFederationSetting('1')

    expect(knexRO).toHaveBeenCalledWith('user_federation_setting')
    expect(query.where).toHaveBeenCalledWith({ userId: '1' })
    expect(query.first).toHaveBeenCalledWith(['userId', 'state', 'updatedBy'])
    expect(row).toEqual({
      userId: '1',
      state: FEDERATION_AUTHOR_SETTING.enabled,
      updatedBy: '99',
    })
  })

  test('loads article federation setting from read-only DB', async () => {
    const { knexRO, query } = createKnexFirst({
      articleId: '101',
      state: FEDERATION_ARTICLE_SETTING.disabled,
      updatedBy: null,
    })
    const service = new FederationExportService({ knexRO } as any)

    const row = await service.loadArticleFederationSetting('101')

    expect(knexRO).toHaveBeenCalledWith('article_federation_setting')
    expect(query.where).toHaveBeenCalledWith({ articleId: '101' })
    expect(query.first).toHaveBeenCalledWith([
      'articleId',
      'state',
      'updatedBy',
    ])
    expect(row).toEqual({
      articleId: '101',
      state: FEDERATION_ARTICLE_SETTING.disabled,
      updatedBy: null,
    })
  })

  test('rejects invalid federation setting states before writing', async () => {
    const { knex } = createKnexWrite([])
    const service = new FederationExportService({ knex } as any)

    await expect(
      service.upsertAuthorFederationSetting({
        userId: '1',
        state: 'inherit' as any,
      })
    ).rejects.toThrow('Invalid author federation setting')
    await expect(
      service.upsertArticleFederationSetting({
        articleId: '101',
        state: 'unknown' as any,
      })
    ).rejects.toThrow('Invalid article federation setting')
    expect(knex).not.toHaveBeenCalled()
  })

  test('records a strict export trigger decision without invoking external delivery', async () => {
    const { knexRO } = createKnexRO([
      {
        articleId: '101',
        articleState: ARTICLE_STATE.active,
        shortHash: 'abc123',
        title: '公開長文',
        summary: '一篇公開長文摘要',
        content: '<p>公開內容</p>',
        tags: ['Fediverse'],
        access: ARTICLE_ACCESS_TYPE.public,
        circleId: null,
        createdAt: new Date('2026-05-02T00:00:00.000Z'),
        updatedAt: new Date('2026-05-02T01:00:00.000Z'),
        authorId: '1',
        userName: 'mashbean',
        displayName: 'Mashbean',
        authorDescription: 'Matters author',
        authorState: USER_STATE.active,
        ipnsKey: 'k51example',
        authorFederationSetting: FEDERATION_AUTHOR_SETTING.enabled,
        articleFederationSetting: FEDERATION_ARTICLE_SETTING.inherit,
      },
    ])
    const { knex, query } = createKnexInsert([
      {
        id: '1',
        articleId: '101',
        actorId: '99',
        trigger: FEDERATION_EXPORT_TRIGGER.publishArticle,
        mode: FEDERATION_EXPORT_TRIGGER_MODE.recordOnly,
        status: 'recorded',
        eligible: true,
        reason: 'eligible',
        authorSetting: FEDERATION_AUTHOR_SETTING.enabled,
        articleSetting: FEDERATION_ARTICLE_SETTING.inherit,
        effectiveArticleSetting: FEDERATION_ARTICLE_SETTING.inherit,
        decisionReport: {
          enforceFederationGate: true,
          selected: 1,
          eligible: 1,
          skipped: 0,
          decisions: [],
        },
      },
    ])
    const service = new FederationExportService({ knex, knexRO } as any)

    const row = await service.recordExportTriggerDecision({
      articleId: '101',
      actorId: '99',
      trigger: FEDERATION_EXPORT_TRIGGER.publishArticle,
    })

    expect(knex).toHaveBeenCalledWith('federation_export_event')
    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        articleId: '101',
        actorId: '99',
        trigger: FEDERATION_EXPORT_TRIGGER.publishArticle,
        mode: FEDERATION_EXPORT_TRIGGER_MODE.recordOnly,
        status: 'recorded',
        eligible: true,
        reason: 'eligible',
        authorSetting: FEDERATION_AUTHOR_SETTING.enabled,
        articleSetting: FEDERATION_ARTICLE_SETTING.inherit,
        effectiveArticleSetting: FEDERATION_ARTICLE_SETTING.inherit,
        decisionReport: expect.objectContaining({
          enforceFederationGate: true,
          selected: 1,
          eligible: 1,
          skipped: 0,
        }),
      })
    )
    expect(query.returning).toHaveBeenCalledWith([
      'id',
      'articleId',
      'actorId',
      'trigger',
      'mode',
      'action',
      'status',
      'eligible',
      'reason',
      'authorSetting',
      'articleSetting',
      'effectiveArticleSetting',
      'decisionReport',
    ])
    expect(row).toMatchObject({
      articleId: '101',
      eligible: true,
      reason: 'eligible',
    })
  })

  test('queues eligible production events with article-level FIFO ordering', async () => {
    const { knex } = createKnexInsert([
      {
        id: 'event-1',
        articleId: '101',
        actorId: '99',
        trigger: FEDERATION_EXPORT_TRIGGER.publishArticle,
        mode: FEDERATION_EXPORT_TRIGGER_MODE.sqs,
        action: FEDERATION_EXPORT_ACTION.create,
        status: 'queued',
        eligible: true,
        reason: 'eligible',
        authorSetting: FEDERATION_AUTHOR_SETTING.enabled,
        articleSetting: FEDERATION_ARTICLE_SETTING.inherit,
        effectiveArticleSetting: FEDERATION_ARTICLE_SETTING.inherit,
        decisionReport: {},
      },
    ])
    const queue = { sqsSendMessage: jest.fn(async () => undefined) }
    const service = new FederationExportService(
      { knex, knexRO: jest.fn() } as any,
      queue
    )
    jest.spyOn(service, 'loadSelectedArticleRows').mockResolvedValue([
      publicRow({
        federationSetting: FEDERATION_ARTICLE_SETTING.inherit,
        author: {
          ...publicRow().author,
          federationSetting: FEDERATION_AUTHOR_SETTING.enabled,
        },
      }),
    ])

    const originalQueueUrl = QUEUE_URL.federationExport
    ;(QUEUE_URL as { federationExport: string }).federationExport =
      'https://sqs.example/federation-export.fifo'
    try {
      await service.recordExportTriggerDecision({
        articleId: '101',
        actorId: '99',
        trigger: FEDERATION_EXPORT_TRIGGER.publishArticle,
        mode: FEDERATION_EXPORT_TRIGGER_MODE.sqs,
      })
    } finally {
      ;(
        QUEUE_URL as { federationExport: string | undefined }
      ).federationExport = originalQueueUrl
    }

    expect(queue.sqsSendMessage).toHaveBeenCalledWith({
      queueUrl: 'https://sqs.example/federation-export.fifo',
      messageGroupId: '101',
      messageDeduplicationId: 'event-1',
      messageBody: expect.objectContaining({
        version: 1,
        eventId: 'event-1',
        articleId: '101',
        action: FEDERATION_EXPORT_ACTION.create,
      }),
    })
  })

  test('rejects unsupported trigger modes before writing an event', async () => {
    const { knex } = createKnexInsert([])
    const service = new FederationExportService({ knex } as any)

    await expect(
      service.recordExportTriggerDecision({
        articleId: '101',
        trigger: FEDERATION_EXPORT_TRIGGER.publishArticle,
        mode: FEDERATION_EXPORT_TRIGGER_MODE.off as any,
      })
    ).rejects.toThrow('Unsupported federation export trigger mode')
    expect(knex).not.toHaveBeenCalled()
  })

  test('rejects invalid trigger names before writing an event', async () => {
    const { knex } = createKnexInsert([])
    const service = new FederationExportService({ knex } as any)

    await expect(
      service.recordExportTriggerDecision({
        articleId: '101',
        trigger: 'unknown_trigger' as any,
      })
    ).rejects.toThrow('Invalid federation export trigger')
    expect(knex).not.toHaveBeenCalled()
  })

  test('rejects missing articles before writing an event', async () => {
    const { knexRO } = createKnexRO([])
    const { knex } = createKnexInsert([])
    const service = new FederationExportService({ knex, knexRO } as any)

    await expect(
      service.recordExportTriggerDecision({
        articleId: '404',
        trigger: FEDERATION_EXPORT_TRIGGER.manual,
      })
    ).rejects.toThrow('Article not found for federation export')
    expect(knex).not.toHaveBeenCalled()
  })

  test('maps gateway profile, notification, and timeline records for Matters', async () => {
    const service = new FederationExportService({} as any)
    const gatewayRequest = jest.fn(async (path: string) => {
      if (path.startsWith('/admin/social/profile')) {
        return {
          actor: {
            id: 'https://matters.town/ap/users/mashbean',
            preferredUsername: 'mashbean',
            name: 'Mashbean',
            summary: 'Writer',
            url: 'https://matters.town/@mashbean',
            icon: { url: 'https://images.example/avatar.jpg' },
            image: { url: 'https://images.example/header.jpg' },
          },
          counts: {
            followers: 2,
            following: 1,
            pendingFollowing: 1,
            unreadNotifications: 3,
          },
          following: [
            {
              actorId: 'https://social.example/users/alice',
              account: 'alice@social.example',
              name: 'Alice',
              status: 'accepted',
            },
          ],
          notifications: [
            {
              notificationId: 'notice-1',
              primaryCategory: 'reply',
              eventCount: 1,
              unreadCount: 1,
            },
          ],
        }
      }
      return {
        items: [
          {
            objectId: 'https://social.example/notes/1',
            content: '<p>Hello</p>',
            viewerEngagement: {
              liked: true,
              announced: false,
              likeActivityId: 'https://matters.town/ap/activities/like-note-1',
            },
            remoteActor: {
              actorId: 'https://social.example/users/alice',
              account: 'alice@social.example',
            },
          },
        ],
      }
    })
    ;(service as any).gatewayRequest = gatewayRequest

    const profile = await service.loadSocialProfile('mashbean')

    expect(profile).toMatchObject({
      handle: 'mashbean',
      avatarUrl: 'https://images.example/avatar.jpg',
      headerUrl: 'https://images.example/header.jpg',
      followersCount: 2,
      followingCount: 1,
      pendingFollowingCount: 1,
      unreadNotificationsCount: 3,
    })
    expect(profile.following[0]).toMatchObject({
      account: 'alice@social.example',
      status: 'accepted',
    })
    expect(profile.notifications[0]).toMatchObject({
      id: 'notice-1',
      category: 'reply',
    })
    expect(profile.timeline[0]).toMatchObject({
      objectId: 'https://social.example/notes/1',
      liked: true,
      announced: false,
      likeActivityId: 'https://matters.town/ap/activities/like-note-1',
      announceActivityId: null,
      remoteActor: { account: 'alice@social.example' },
    })
  })

  test('loads the unread count without loading the full social profile', async () => {
    const service = new FederationExportService({} as any)
    const gatewayRequest = jest.fn(async () => ({
      unreadNotificationsCount: 7,
    }))
    ;(service as any).gatewayRequest = gatewayRequest

    await expect(service.loadSocialUnreadCount('mashbean')).resolves.toBe(7)
    expect(gatewayRequest).toHaveBeenCalledWith(
      '/admin/social/unread-count?actorHandle=mashbean'
    )
  })

  test('refreshes an enabled author profile with current avatar and cover', async () => {
    const settingQuery: any = {
      where: jest.fn(() => settingQuery),
      first: jest.fn(async () => ({
        userId: '1',
        state: FEDERATION_AUTHOR_SETTING.enabled,
      })),
    }
    const profileQuery: any = {
      leftJoin: jest.fn(() => profileQuery),
      where: jest.fn(() => profileQuery),
      first: jest.fn(async () => ({
        authorId: '1',
        userName: 'Mashbean',
        displayName: 'Mashbean',
        description: 'Writer',
        state: USER_STATE.active,
        avatarPath: 'avatar/mashbean.jpg',
        headerPath: 'profileCover/mashbean.jpg',
      })),
    }
    const knexRO = jest.fn((table: string) =>
      table === 'user_federation_setting' ? settingQuery : profileQuery
    )
    const service = new FederationExportService({ knexRO } as any)
    const gatewayRequest = jest.fn(async () => ({ status: 'updated' }))
    ;(service as any).gatewayRequest = gatewayRequest

    await expect(service.refreshSocialProfile('1')).resolves.toBe(true)
    expect(gatewayRequest).toHaveBeenCalledWith(
      '/admin/actors',
      expect.objectContaining({
        method: 'POST',
        data: expect.objectContaining({
          handle: 'mashbean',
          displayName: 'Mashbean',
          avatarUrl: expect.stringContaining('/avatar/mashbean.jpg/public'),
          headerUrl: expect.stringContaining(
            '/profileCover/mashbean.jpg/public'
          ),
        }),
      })
    )
  })

  test('skips profile refresh when publishing is disabled or identity is incomplete', async () => {
    const disabledSettingQuery: any = {
      where: jest.fn(() => disabledSettingQuery),
      first: jest.fn(async () => ({
        userId: '1',
        state: FEDERATION_AUTHOR_SETTING.disabled,
      })),
    }
    const disabledKnexRO = jest.fn(() => disabledSettingQuery)
    const disabledService = new FederationExportService({
      knexRO: disabledKnexRO,
    } as any)

    await expect(disabledService.refreshSocialProfile('1')).resolves.toBe(false)
    expect(disabledKnexRO).toHaveBeenCalledTimes(1)

    const enabledSettingQuery: any = {
      where: jest.fn(() => enabledSettingQuery),
      first: jest.fn(async () => ({
        userId: '2',
        state: FEDERATION_AUTHOR_SETTING.enabled,
      })),
    }
    const incompleteProfileQuery: any = {
      leftJoin: jest.fn(() => incompleteProfileQuery),
      where: jest.fn(() => incompleteProfileQuery),
      first: jest.fn(async () => ({
        authorId: '2',
        userName: null,
        displayName: 'Incomplete',
        state: USER_STATE.active,
      })),
    }
    const enabledKnexRO = jest.fn((table: string) =>
      table === 'user_federation_setting'
        ? enabledSettingQuery
        : incompleteProfileQuery
    )
    const enabledService = new FederationExportService({
      knexRO: enabledKnexRO,
    } as any)

    await expect(enabledService.refreshSocialProfile('2')).resolves.toBe(false)
  })

  test('builds safe outbound follow and reply gateway requests', async () => {
    const service = new FederationExportService({} as any)
    const gatewayRequest = jest.fn(async () => ({
      status: 'queued',
      activityId: 'https://matters.town/ap/activities/1',
    }))
    ;(service as any).gatewayRequest = gatewayRequest

    await service.runSocialAction({
      actorHandle: 'mashbean',
      actorId: '1',
      input: {
        action: 'follow',
        account: '@alice@social.example',
      },
    })
    await service.runSocialAction({
      actorHandle: 'mashbean',
      actorId: '1',
      input: {
        action: 'reply',
        objectId: 'https://social.example/notes/1',
        remoteActorId: 'https://social.example/users/alice',
        content: '<script>alert(1)</script>',
      },
    })
    await service.runSocialAction({
      actorHandle: 'mashbean',
      actorId: '1',
      input: {
        action: 'like',
        objectId: 'https://social.example/notes/1',
        remoteActorId: 'https://social.example/users/alice',
      },
    })

    expect(gatewayRequest).toHaveBeenNthCalledWith(
      1,
      '/users/mashbean/outbox/follow',
      expect.objectContaining({
        method: 'POST',
        data: expect.objectContaining({
          account: '@alice@social.example',
        }),
      })
    )
    expect(gatewayRequest).toHaveBeenNthCalledWith(
      2,
      '/users/mashbean/outbox/create',
      expect.objectContaining({
        method: 'POST',
        data: expect.objectContaining({
          object: expect.objectContaining({
            content: '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
            inReplyTo: 'https://social.example/notes/1',
          }),
        }),
      })
    )
    expect(gatewayRequest).toHaveBeenNthCalledWith(
      3,
      '/users/mashbean/outbox/engagement',
      expect.objectContaining({
        method: 'POST',
        data: expect.objectContaining({
          idempotencyKey: 'like:1:https://social.example/notes/1',
          objectId: 'https://social.example/notes/1',
          type: 'Like',
        }),
      })
    )
  })

  test('maps article social state and resolves remote actors', async () => {
    const service = new FederationExportService({} as any)
    const gatewayRequest = jest.fn(async (path: string) => {
      if (path.startsWith('/admin/social/article')) {
        return {
          contentId: 'article-101',
          content: {
            metrics: {
              replies: 1,
              likes: 2,
              announces: 3,
            },
          },
          notifications: [
            {
              notificationId: 'notice-1',
              eventCount: 2,
              unreadCount: 1,
            },
          ],
          replies: [
            {
              objectId: 'https://social.example/notes/reply-1',
              content: '<p>Reply</p>',
              remoteActor: {
                actorId: 'https://social.example/users/alice',
                account: 'alice@social.example',
              },
            },
          ],
        }
      }
      return {
        item: {
          actorId: 'https://social.example/users/alice',
          account: 'alice@social.example',
          name: 'Alice',
          status: 'accepted',
        },
      }
    })
    ;(service as any).gatewayRequest = gatewayRequest

    await expect(
      service.loadArticleSocial({
        actorHandle: 'mashbean',
        contentRef: 'https://matters.town/a/abc123',
      })
    ).resolves.toMatchObject({
      contentId: 'article-101',
      repliesCount: 1,
      likesCount: 2,
      announcesCount: 3,
      notificationsCount: 2,
      unreadNotificationsCount: 1,
      replies: [
        {
          objectId: 'https://social.example/notes/reply-1',
          remoteActor: {
            account: 'alice@social.example',
          },
        },
      ],
    })
    await expect(
      service.resolveSocialRemoteActor({
        account: '@alice@social.example',
        actorId: 'https://social.example/users/alice',
      })
    ).resolves.toMatchObject({
      actorId: 'https://social.example/users/alice',
      account: 'alice@social.example',
      status: 'accepted',
    })

    expect(gatewayRequest).toHaveBeenNthCalledWith(
      1,
      '/admin/social/article?actorHandle=mashbean&contentRef=https%3A%2F%2Fmatters.town%2Fa%2Fabc123'
    )
    expect(gatewayRequest).toHaveBeenNthCalledWith(
      2,
      '/admin/social/remote-actor?account=%40alice%40social.example&actorId=https%3A%2F%2Fsocial.example%2Fusers%2Falice'
    )
  })

  test('builds reversible moderation and notification gateway requests', async () => {
    const service = new FederationExportService({} as any)
    const gatewayRequest = jest.fn(async () => ({
      status: 'ok',
      mapping: 'saved',
    }))
    ;(service as any).gatewayRequest = gatewayRequest
    const remoteActorId = 'https://social.example/users/alice'
    const objectId = 'https://social.example/notes/1'

    await service.runSocialAction({
      actorHandle: 'mashbean',
      actorId: '1',
      input: {
        action: 'unfollow',
        remoteActorId,
        activityId: 'https://matters.town/ap/activities/follow-1',
      },
    })
    await service.runSocialAction({
      actorHandle: 'mashbean',
      actorId: '1',
      input: {
        action: 'announce',
        remoteActorId,
        objectId,
      },
    })
    await service.runSocialAction({
      actorHandle: 'mashbean',
      actorId: '1',
      input: {
        action: 'unlike',
        remoteActorId,
        objectId,
        activityId: 'https://matters.town/ap/activities/like-1',
      },
    })
    await service.runSocialAction({
      actorHandle: 'mashbean',
      actorId: '1',
      input: {
        action: 'unannounce',
        remoteActorId,
        objectId,
      },
    })
    await service.runSocialAction({
      actorHandle: 'mashbean',
      actorId: '1',
      input: {
        action: 'block',
        remoteActorId,
        reason: 'spam',
      },
    })
    await service.runSocialAction({
      actorHandle: 'mashbean',
      actorId: '1',
      input: {
        action: 'unblock',
        remoteActorId,
      },
    })
    await service.runSocialAction({
      actorHandle: 'mashbean',
      actorId: '1',
      input: {
        action: 'report',
        remoteActorId,
        objectId,
        reason: 'spam',
      },
    })
    const result = await service.runSocialAction({
      actorHandle: 'mashbean',
      actorId: '1',
      input: {
        action: 'mark_read',
        notificationIds: ['notice-1', 'notice-2'],
      },
    })

    expect(result).toEqual({
      status: 'ok',
      mapping: 'saved',
      activityId: null,
      remoteActorId: null,
    })
    expect(gatewayRequest).toHaveBeenNthCalledWith(
      1,
      '/users/mashbean/outbox/undo',
      expect.objectContaining({
        method: 'POST',
        data: expect.objectContaining({
          mapping: 'follow',
          objectId: remoteActorId,
        }),
      })
    )
    expect(gatewayRequest).toHaveBeenNthCalledWith(
      2,
      '/users/mashbean/outbox/engagement',
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'Announce',
          objectId,
        }),
      })
    )
    expect(gatewayRequest).toHaveBeenNthCalledWith(
      3,
      '/users/mashbean/outbox/undo',
      expect.objectContaining({
        data: expect.objectContaining({
          mapping: 'like',
          objectId,
        }),
      })
    )
    expect(gatewayRequest).toHaveBeenNthCalledWith(
      4,
      '/users/mashbean/outbox/undo',
      expect.objectContaining({
        data: expect.objectContaining({
          mapping: 'announce',
          objectId,
        }),
      })
    )
    expect(gatewayRequest).toHaveBeenNthCalledWith(
      5,
      '/admin/social/block',
      expect.objectContaining({
        data: expect.objectContaining({
          remoteActorId,
          reason: 'spam',
          createdBy: 'user:1',
        }),
      })
    )
    expect(gatewayRequest).toHaveBeenNthCalledWith(
      6,
      '/admin/social/unblock',
      expect.objectContaining({
        data: expect.objectContaining({
          remoteActorId,
          updatedBy: 'user:1',
        }),
      })
    )
    expect(gatewayRequest).toHaveBeenNthCalledWith(
      7,
      '/admin/social/report',
      expect.objectContaining({
        data: expect.objectContaining({
          remoteActorId,
          objectId,
          reason: 'spam',
        }),
      })
    )
    expect(gatewayRequest).toHaveBeenNthCalledWith(
      8,
      '/admin/local-notifications/read',
      expect.objectContaining({
        data: {
          actorHandle: 'mashbean',
          notificationIds: ['notice-1', 'notice-2'],
          read: true,
          updatedBy: 'user:1',
        },
      })
    )

    await expect(
      service.runSocialAction({
        actorHandle: 'mashbean',
        actorId: '1',
        input: {
          action: 'reply',
          objectId,
        },
      })
    ).rejects.toThrow('Reply content and object are required')
    await expect(
      service.runSocialAction({
        actorHandle: 'mashbean',
        actorId: '1',
        input: {
          action: 'unsupported' as any,
        },
      })
    ).rejects.toThrow('Unsupported Fediverse action')
  })

  test('maps social operations data and resolves user reports', async () => {
    const service = new FederationExportService({} as any)
    const gatewayRequest = jest.fn(async (path: string) => {
      if (path === '/admin/queues/outbound?traceLimit=20') {
        return { queue: { summary: {}, deadLetters: {} } }
      }
      if (path.startsWith('/admin/dead-letters')) {
        return { items: [] }
      }
      if (path.startsWith('/admin/audit-log')) {
        return { items: [] }
      }
      if (path === '/admin/social/summary') {
        return {
          totals: { actors: 4, following: 2, openReports: 1 },
          limits: { timelineRetentionDays: 30, timelineMaxItems: 1000 },
        }
      }
      if (path.startsWith('/admin/abuse-queue')) {
        return {
          items: [
            {
              id: 'report-1',
              status: 'open',
              category: 'user-report',
              actorHandle: 'mashbean',
              remoteActorId: 'https://social.example/users/alice',
              reason: 'spam',
            },
          ],
        }
      }
      return { status: 'ok' }
    })
    ;(service as any).gatewayRequest = gatewayRequest

    const dashboard = await service.loadGatewayDashboard()
    await service.pruneGatewaySocialData({
      operatorId: '99',
      retentionDays: 14,
      maxItems: 500,
    })
    await service.resolveGatewayAbuseCase({
      id: 'report-1',
      operatorId: '99',
      resolution: 'reviewed',
    })

    expect(dashboard.social).toMatchObject({
      actors: 4,
      following: 2,
      openReports: 1,
      timelineRetentionDays: 30,
      timelineMaxItems: 1000,
    })
    expect(dashboard.reports).toHaveLength(1)
    expect(gatewayRequest).toHaveBeenCalledWith(
      '/admin/social/prune',
      expect.objectContaining({
        method: 'POST',
        data: expect.objectContaining({
          retentionDays: 14,
          maxItems: 500,
        }),
      })
    )
    expect(gatewayRequest).toHaveBeenCalledWith(
      '/admin/abuse-queue/resolve',
      expect.objectContaining({
        method: 'POST',
        data: expect.objectContaining({
          id: 'report-1',
          resolution: 'reviewed',
        }),
      })
    )
  })
})
