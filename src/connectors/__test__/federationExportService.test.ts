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

describe('federationExportService', () => {
  test('builds canonical Matters article URLs from short hashes', () => {
    expect(
      buildMattersArticleUrl({
        siteDomain: 'matters.town',
        articleId: '101',
        shortHash: 'abc123',
      })
    ).toBe('https://matters.town/a/abc123')
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
})
