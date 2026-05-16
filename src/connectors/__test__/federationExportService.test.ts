import {
  ARTICLE_ACCESS_TYPE,
  ARTICLE_STATE,
  USER_STATE,
} from '#common/enums/index.js'
import { jest } from '@jest/globals'
import {
  buildMattersArticleUrl,
  evaluateFederationExportRows,
  FEDERATION_ARTICLE_SETTING,
  FEDERATION_AUTHOR_SETTING,
  FEDERATION_EXPORT_TRIGGER,
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
    expect(query.leftJoin).toHaveBeenCalledTimes(1)
    expect(query.leftJoin).toHaveBeenCalledWith('user_ipns_keys as ipnsKey', {
      'ipnsKey.userId': 'author.id',
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
})
