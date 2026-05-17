import type { Connections } from '#definitions/index.js'
import type { Knex } from 'knex'

import {
  ARTICLE_ACCESS_TYPE,
  ARTICLE_STATE,
  USER_STATE,
} from '#common/enums/index.js'

export type FederationExportAuthor = {
  id: string
  userName: string | null
  displayName: string | null
  description?: string | null
  state?: string | null
  ipnsKey?: string | null
  federationSetting?: FederationAuthorSetting | null
}

export type FederationExportArticleRow = {
  articleId: string
  articleState: string
  shortHash?: string | null
  title: string
  summary: string
  content: string
  tags?: string[] | null
  access: string
  circleId?: string | null
  coverUrl?: string | null
  createdAt: Date | string
  updatedAt?: Date | string | null
  federationSetting?: FederationArticleSetting | null
  author: FederationExportAuthor
}

export const FEDERATION_AUTHOR_SETTING = {
  enabled: 'enabled',
  disabled: 'disabled',
} as const

export const FEDERATION_ARTICLE_SETTING = {
  inherit: 'inherit',
  enabled: 'enabled',
  disabled: 'disabled',
} as const

export const FEDERATION_EXPORT_TRIGGER = {
  publishArticle: 'publish_article',
  reviseArticle: 'revise_article',
  manual: 'manual',
  settingChange: 'setting_change',
} as const

export const FEDERATION_EXPORT_TRIGGER_MODE = {
  off: 'off',
  recordOnly: 'record_only',
} as const

export type FederationAuthorSetting =
  (typeof FEDERATION_AUTHOR_SETTING)[keyof typeof FEDERATION_AUTHOR_SETTING]

export type FederationArticleSetting =
  (typeof FEDERATION_ARTICLE_SETTING)[keyof typeof FEDERATION_ARTICLE_SETTING]

export type FederationExportTrigger =
  (typeof FEDERATION_EXPORT_TRIGGER)[keyof typeof FEDERATION_EXPORT_TRIGGER]

export type FederationExportTriggerMode =
  (typeof FEDERATION_EXPORT_TRIGGER_MODE)[keyof typeof FEDERATION_EXPORT_TRIGGER_MODE]

export type FederationExportGateInput = {
  row: FederationExportArticleRow
  authorSetting?: FederationAuthorSetting | null
  articleSetting?: FederationArticleSetting | null
}

export type FederationExportGateResult = {
  eligible: boolean
  reason:
    | 'eligible'
    | 'article_not_public'
    | 'author_not_opted_in'
    | 'article_disabled'
  effectiveArticleSetting: FederationArticleSetting
}

export type FederationExportDecision = FederationExportGateResult & {
  articleId: string
  authorSetting: FederationAuthorSetting | null
  articleSetting: FederationArticleSetting | null
}

export type FederationExportDecisionReport = {
  enforceFederationGate: boolean
  selected: number
  eligible: number
  skipped: number
  decisions: FederationExportDecision[]
}

export type FederationExportEvent = {
  id: string
  articleId: string
  actorId: string | null
  trigger: FederationExportTrigger
  mode: typeof FEDERATION_EXPORT_TRIGGER_MODE.recordOnly
  status: 'recorded'
  eligible: boolean
  reason: FederationExportDecision['reason']
  authorSetting: FederationAuthorSetting | null
  articleSetting: FederationArticleSetting | null
  effectiveArticleSetting: FederationArticleSetting
  decisionReport: FederationExportDecisionReport
}

export type FederationAuthorSettingRow = {
  userId: string
  state: FederationAuthorSetting
  updatedBy?: string | null
}

export type FederationArticleSettingRow = {
  articleId: string
  state: FederationArticleSetting
  updatedBy?: string | null
}

export type RecordFederationExportTriggerInput = {
  articleId: string
  actorId?: string | null
  trigger: FederationExportTrigger
  mode?: typeof FEDERATION_EXPORT_TRIGGER_MODE.recordOnly
}

type ArticleExportQueryRow = {
  articleId: string
  articleState: string
  shortHash: string | null
  title: string
  summary: string
  content: string
  tags: string[] | null
  access: string
  circleId: string | null
  createdAt: Date
  updatedAt: Date
  authorId: string
  userName: string | null
  displayName: string | null
  authorDescription: string | null
  authorState: string | null
  ipnsKey: string | null
  authorFederationSetting?: FederationAuthorSetting | null
  articleFederationSetting?: FederationArticleSetting | null
}

export const isFederationPublicArticleRow = (row: FederationExportArticleRow) =>
  row.articleState === ARTICLE_STATE.active &&
  row.access === ARTICLE_ACCESS_TYPE.public &&
  row.author.state !== USER_STATE.archived &&
  !!row.author.userName &&
  !!row.author.displayName

export const resolveFederationExportGate = ({
  row,
  authorSetting,
  articleSetting,
}: FederationExportGateInput): FederationExportGateResult => {
  const effectiveArticleSetting =
    articleSetting ?? FEDERATION_ARTICLE_SETTING.inherit

  if (!isFederationPublicArticleRow(row)) {
    return {
      eligible: false,
      reason: 'article_not_public',
      effectiveArticleSetting,
    }
  }

  if (effectiveArticleSetting === FEDERATION_ARTICLE_SETTING.disabled) {
    return {
      eligible: false,
      reason: 'article_disabled',
      effectiveArticleSetting,
    }
  }

  if (authorSetting !== FEDERATION_AUTHOR_SETTING.enabled) {
    return {
      eligible: false,
      reason: 'author_not_opted_in',
      effectiveArticleSetting,
    }
  }

  return {
    eligible: true,
    reason: 'eligible',
    effectiveArticleSetting,
  }
}

export const resolveFederationExportGateForRow = (
  row: FederationExportArticleRow
) =>
  resolveFederationExportGate({
    row,
    authorSetting: row.author.federationSetting,
    articleSetting: row.federationSetting,
  })

export const evaluateFederationExportRows = ({
  rows,
  enforceFederationGate = false,
}: {
  rows: FederationExportArticleRow[]
  enforceFederationGate?: boolean
}): FederationExportDecisionReport => {
  const decisions = rows.map((row) => {
    const gate: FederationExportGateResult = enforceFederationGate
      ? resolveFederationExportGateForRow(row)
      : {
          eligible: isFederationPublicArticleRow(row),
          reason: isFederationPublicArticleRow(row)
            ? 'eligible'
            : 'article_not_public',
          effectiveArticleSetting:
            row.federationSetting ?? FEDERATION_ARTICLE_SETTING.inherit,
        }

    return {
      ...gate,
      articleId: row.articleId,
      authorSetting: row.author.federationSetting ?? null,
      articleSetting: row.federationSetting ?? null,
    }
  })
  const eligible = decisions.filter((decision) => decision.eligible).length

  return {
    enforceFederationGate,
    selected: rows.length,
    eligible,
    skipped: rows.length - eligible,
    decisions,
  }
}

export const buildMattersArticleUrl = ({
  siteDomain,
  articleId,
  shortHash,
}: {
  siteDomain: string
  articleId: string
  shortHash?: string | null
}) => `https://${siteDomain}/a/${shortHash || articleId}`

export class FederationExportService {
  private knex: Knex
  private knexRO: Knex

  public constructor(connections: Connections) {
    this.knex = connections.knex
    this.knexRO = connections.knexRO
  }

  public async upsertAuthorFederationSetting({
    userId,
    state,
    updatedBy = null,
  }: FederationAuthorSettingRow): Promise<FederationAuthorSettingRow> {
    if (!Object.values(FEDERATION_AUTHOR_SETTING).includes(state)) {
      throw new Error(`Invalid author federation setting: ${state}`)
    }

    const [row] = await this.knex('user_federation_setting')
      .insert({ userId, state, updatedBy })
      .onConflict('userId')
      .merge({
        state,
        updatedBy,
        updatedAt: this.knex.fn.now(),
      })
      .returning(['userId', 'state', 'updatedBy'])

    return row
  }

  public async upsertArticleFederationSetting({
    articleId,
    state,
    updatedBy = null,
  }: FederationArticleSettingRow): Promise<FederationArticleSettingRow> {
    if (!Object.values(FEDERATION_ARTICLE_SETTING).includes(state)) {
      throw new Error(`Invalid article federation setting: ${state}`)
    }

    const [row] = await this.knex('article_federation_setting')
      .insert({ articleId, state, updatedBy })
      .onConflict('articleId')
      .merge({
        state,
        updatedBy,
        updatedAt: this.knex.fn.now(),
      })
      .returning(['articleId', 'state', 'updatedBy'])

    return row
  }

  public async loadAuthorFederationSetting(
    userId: string
  ): Promise<FederationAuthorSettingRow | null> {
    const row = await this.knexRO('user_federation_setting')
      .where({ userId })
      .first(['userId', 'state', 'updatedBy'])

    return row ?? null
  }

  public async loadArticleFederationSetting(
    articleId: string
  ): Promise<FederationArticleSettingRow | null> {
    const row = await this.knexRO('article_federation_setting')
      .where({ articleId })
      .first(['articleId', 'state', 'updatedBy'])

    return row ?? null
  }

  public async loadSelectedArticleRows(
    articleIds: string[],
    options: { includeFederationSettings?: boolean } = {}
  ): Promise<FederationExportArticleRow[]> {
    if (articleIds.length === 0) {
      throw new Error('Explicit articleIds are required for federation export')
    }

    const query = this.knexRO<ArticleExportQueryRow>('article')
      .join('article_version_newest as articleVersion', {
        'articleVersion.articleId': 'article.id',
      })
      .join('article_content as articleContent', {
        'articleContent.id': 'articleVersion.contentId',
      })
      .join('user as author', {
        'author.id': 'article.authorId',
      })
      .leftJoin('user_ipns_keys as ipnsKey', {
        'ipnsKey.userId': 'author.id',
      })
      .whereIn('article.id', articleIds)
      .select([
        'article.id as articleId',
        'article.state as articleState',
        'article.shortHash as shortHash',
        'articleVersion.title as title',
        'articleVersion.summary as summary',
        'articleContent.content as content',
        'articleVersion.tags as tags',
        'articleVersion.access as access',
        'articleVersion.circleId as circleId',
        'articleVersion.createdAt as createdAt',
        'articleVersion.updatedAt as updatedAt',
        'author.id as authorId',
        'author.userName as userName',
        'author.displayName as displayName',
        'author.description as authorDescription',
        'author.state as authorState',
        'ipnsKey.ipnsKey as ipnsKey',
      ])

    if (options.includeFederationSettings) {
      query
        .leftJoin('user_federation_setting as authorFederation', {
          'authorFederation.userId': 'author.id',
        })
        .leftJoin('article_federation_setting as articleFederation', {
          'articleFederation.articleId': 'article.id',
        })
        .select([
          'authorFederation.state as authorFederationSetting',
          'articleFederation.state as articleFederationSetting',
        ])
    }

    const rows = await query

    const rowsByArticleId = new Map(rows.map((row) => [row.articleId, row]))

    return articleIds
      .map((articleId) => rowsByArticleId.get(articleId))
      .filter((row): row is ArticleExportQueryRow => !!row)
      .map((row) => ({
        articleId: row.articleId,
        articleState: row.articleState,
        shortHash: row.shortHash,
        title: row.title,
        summary: row.summary,
        content: row.content,
        tags: row.tags ?? [],
        access: row.access,
        circleId: row.circleId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        federationSetting: row.articleFederationSetting,
        author: {
          id: row.authorId,
          userName: row.userName,
          displayName: row.displayName,
          description: row.authorDescription,
          state: row.authorState,
          ipnsKey: row.ipnsKey,
          federationSetting: row.authorFederationSetting,
        },
      }))
  }

  public async recordExportTriggerDecision({
    articleId,
    actorId = null,
    trigger,
    mode = FEDERATION_EXPORT_TRIGGER_MODE.recordOnly,
  }: RecordFederationExportTriggerInput): Promise<FederationExportEvent> {
    if (mode !== FEDERATION_EXPORT_TRIGGER_MODE.recordOnly) {
      throw new Error(`Unsupported federation export trigger mode: ${mode}`)
    }

    if (!Object.values(FEDERATION_EXPORT_TRIGGER).includes(trigger)) {
      throw new Error(`Invalid federation export trigger: ${trigger}`)
    }

    const rows = await this.loadSelectedArticleRows([articleId], {
      includeFederationSettings: true,
    })

    if (rows.length === 0) {
      throw new Error(`Article not found for federation export: ${articleId}`)
    }

    const decisionReport = evaluateFederationExportRows({
      rows,
      enforceFederationGate: true,
    })
    const [decision] = decisionReport.decisions

    const [row] = await this.knex('federation_export_event')
      .insert({
        articleId,
        actorId,
        trigger,
        mode,
        status: 'recorded',
        eligible: decision.eligible,
        reason: decision.reason,
        authorSetting: decision.authorSetting,
        articleSetting: decision.articleSetting,
        effectiveArticleSetting: decision.effectiveArticleSetting,
        decisionReport,
      })
      .returning([
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

    return row
  }
}
