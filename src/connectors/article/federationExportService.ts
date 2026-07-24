import type { Connections, GlobalId } from '#definitions/index.js'
import type { Knex } from 'knex'

import {
  ARTICLE_ACCESS_TYPE,
  ARTICLE_STATE,
  QUEUE_URL,
  USER_STATE,
} from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import { ServerError } from '#common/errors.js'
import { getLogger } from '#common/logger.js'
import axios from 'axios'
import { randomUUID } from 'node:crypto'

import { aws } from '../aws/index.js'
import { CloudflareService } from '../cloudflare/index.js'

export type FederationExportAuthor = {
  id: string
  userName: string | null
  displayName: string | null
  description?: string | null
  state?: string | null
  ipnsKey?: string | null
  avatarUrl?: string | null
  headerUrl?: string | null
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
  archiveArticle: 'archive_article',
  manual: 'manual',
  settingChange: 'setting_change',
} as const

export const FEDERATION_EXPORT_TRIGGER_MODE = {
  off: 'off',
  recordOnly: 'record_only',
  sqs: 'sqs',
} as const

export const FEDERATION_EXPORT_ACTION = {
  create: 'create',
  update: 'update',
  delete: 'delete',
} as const

export type FederationAuthorSetting =
  (typeof FEDERATION_AUTHOR_SETTING)[keyof typeof FEDERATION_AUTHOR_SETTING]

export type FederationArticleSetting =
  (typeof FEDERATION_ARTICLE_SETTING)[keyof typeof FEDERATION_ARTICLE_SETTING]

export type FederationExportTrigger =
  (typeof FEDERATION_EXPORT_TRIGGER)[keyof typeof FEDERATION_EXPORT_TRIGGER]

export type FederationExportTriggerMode =
  (typeof FEDERATION_EXPORT_TRIGGER_MODE)[keyof typeof FEDERATION_EXPORT_TRIGGER_MODE]

export type FederationExportAction =
  (typeof FEDERATION_EXPORT_ACTION)[keyof typeof FEDERATION_EXPORT_ACTION]

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
  mode: FederationExportTriggerMode
  action: FederationExportAction
  status: 'recorded' | 'queued' | 'skipped' | 'failed'
  eligible: boolean
  reason: FederationExportDecision['reason']
  authorSetting: FederationAuthorSetting | null
  articleSetting: FederationArticleSetting | null
  effectiveArticleSetting: FederationArticleSetting
  decisionReport: FederationExportDecisionReport
}

export type FederationGatewayDashboard = {
  generatedAt: string
  queue: {
    total: number
    pending: number
    processing: number
    delivered: number
    deadLetter: number
    resolved: number
    retryPending: number
    openDeadLetters: number
    replayedDeadLetters: number
    resolvedDeadLetters: number
    oldestPendingAt: string | null
  }
  deadLetters: Array<{
    id: GlobalId
    status: string
    actorHandle: string | null
    targetActorId: string | null
    activityId: string | null
    activityType: string | null
    recordedAt: string | null
  }>
  auditEvents: Array<{
    timestamp: string | null
    event: string
    actorHandle: string | null
    itemId: string | null
    reason: string | null
  }>
  reports: Array<{
    id: GlobalId
    status: string
    category: string
    actorHandle: string | null
    remoteActorId: string | null
    remoteDomain: string | null
    objectId: string | null
    reason: string | null
    createdAt: string | null
  }>
  social: {
    actors: number
    followers: number
    following: number
    pendingFollowing: number
    blocked: number
    unreadNotifications: number
    inboundObjects: number
    inboundEngagements: number
    openReports: number
    maxFollowingPerActor: number
    timelineRetentionDays: number
    timelineMaxItems: number
  }
}

export type FederationSocialRemoteActor = {
  actorId: string
  account: string | null
  preferredUsername: string | null
  name: string | null
  summary: string
  url: string
  avatarUrl: string | null
  status: string | null
}

export type FederationSocialNotification = {
  id: string
  category: string
  contentId: string | null
  objectId: string | null
  remoteActorIds: string[]
  headline: string | null
  preview: string | null
  eventCount: number
  unreadCount: number
  publishedAt: string | null
}

export type FederationSocialPost = {
  objectId: string
  content: string
  summary: string
  url: string | null
  inReplyTo: string | null
  publishedAt: string | null
  liked: boolean
  announced: boolean
  likeActivityId: string | null
  announceActivityId: string | null
  remoteActor: FederationSocialRemoteActor
}

export type FederationSocialProfile = {
  actorId: string
  handle: string
  account: string
  displayName: string
  summary: string
  profileUrl: string
  avatarUrl: string | null
  headerUrl: string | null
  followersCount: number
  followingCount: number
  pendingFollowingCount: number
  unreadNotificationsCount: number
  maxFollowing: number
  retentionDays: number
  timelineMaxItems: number
  following: FederationSocialRemoteActor[]
  notifications: FederationSocialNotification[]
  timeline: FederationSocialPost[]
}

export type FederationArticleSocial = {
  contentId: string | null
  repliesCount: number
  likesCount: number
  announcesCount: number
  notificationsCount: number
  unreadNotificationsCount: number
  replies: FederationSocialPost[]
}

export type FederationSocialAction =
  | 'follow'
  | 'unfollow'
  | 'reply'
  | 'like'
  | 'unlike'
  | 'announce'
  | 'unannounce'
  | 'block'
  | 'unblock'
  | 'report'
  | 'mark_read'

export type FederationSocialActionInput = {
  action: FederationSocialAction
  account?: string | null
  remoteActorId?: string | null
  objectId?: string | null
  content?: string | null
  activityId?: string | null
  notificationIds?: string[] | null
  reason?: string | null
}

export type FederationSocialActionResult = {
  status: string
  mapping: string | null
  activityId: string | null
  remoteActorId: string | null
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
  mode?: FederationExportTriggerMode
  action?: FederationExportAction
}

type FederationQueue = {
  sqsSendMessage: (input: {
    messageBody: unknown
    queueUrl: string
    messageGroupId?: string
    messageDeduplicationId?: string
  }) => Promise<unknown> | unknown
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
  authorAvatarPath: string | null
  authorProfileCoverPath: string | null
  authorFederationSetting?: FederationAuthorSetting | null
  articleFederationSetting?: FederationArticleSetting | null
}

type GatewayRemoteActorRecord = {
  actorId?: string
  remoteActorId?: string
  account?: string | null
  preferredUsername?: string | null
  name?: string | null
  summary?: string | null
  url?: string | null
  avatarUrl?: string | null
  status?: string | null
}

type GatewayInboundObjectRecord = {
  objectId?: string
  content?: string | null
  summary?: string | null
  url?: string | null
  inReplyTo?: string | null
  publishedAt?: string | null
  receivedAt?: string | null
  viewerEngagement?: {
    liked?: boolean
    announced?: boolean
    likeActivityId?: string | null
    announceActivityId?: string | null
  }
  remoteActor?: GatewayRemoteActorRecord
}

type GatewayNotificationRecord = {
  notificationId?: string
  primaryCategory?: string
  contentId?: string | null
  objectId?: string | null
  remoteActorIds?: string[]
  headline?: string | null
  preview?: string | null
  eventCount?: number
  unreadCount?: number
  publishedAt?: string | null
  receivedAt?: string | null
}

const mapRemoteActor = (
  actor: GatewayRemoteActorRecord
): FederationSocialRemoteActor => {
  const actorId = actor.actorId ?? actor.remoteActorId ?? ''
  return {
    actorId,
    account: actor.account ?? null,
    preferredUsername: actor.preferredUsername ?? null,
    name: actor.name ?? actor.preferredUsername ?? null,
    summary: actor.summary ?? '',
    url: actor.url ?? actorId,
    avatarUrl: actor.avatarUrl ?? null,
    status: actor.status ?? null,
  }
}

const mapSocialPost = (
  record: GatewayInboundObjectRecord
): FederationSocialPost => ({
  objectId: record.objectId ?? '',
  content: record.content ?? '',
  summary: record.summary ?? '',
  url: record.url ?? null,
  inReplyTo: record.inReplyTo ?? null,
  publishedAt: record.publishedAt ?? record.receivedAt ?? null,
  liked: record.viewerEngagement?.liked ?? false,
  announced: record.viewerEngagement?.announced ?? false,
  likeActivityId: record.viewerEngagement?.likeActivityId ?? null,
  announceActivityId: record.viewerEngagement?.announceActivityId ?? null,
  remoteActor: mapRemoteActor(record.remoteActor ?? {}),
})

const mapNotification = (
  record: GatewayNotificationRecord
): FederationSocialNotification => ({
  id: record.notificationId ?? '',
  category: record.primaryCategory ?? 'unknown',
  contentId: record.contentId ?? null,
  objectId: record.objectId ?? null,
  remoteActorIds: record.remoteActorIds ?? [],
  headline: record.headline ?? null,
  preview: record.preview ?? null,
  eventCount: record.eventCount ?? 0,
  unreadCount: record.unreadCount ?? 0,
  publishedAt: record.publishedAt ?? record.receivedAt ?? null,
})

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

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
  private queue: FederationQueue
  private cloudflare = new CloudflareService()

  public constructor(connections: Connections, queue: FederationQueue = aws) {
    this.knex = connections.knex
    this.knexRO = connections.knexRO
    this.queue = queue
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
    options: {
      includeFederationSettings?: boolean
      usePrimary?: boolean
    } = {}
  ): Promise<FederationExportArticleRow[]> {
    if (articleIds.length === 0) {
      throw new Error('Explicit articleIds are required for federation export')
    }

    const connection = options.usePrimary ? this.knex : this.knexRO
    const query = connection<ArticleExportQueryRow>('article')
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
      .leftJoin('asset as authorAvatar', {
        'authorAvatar.id': 'author.avatar',
      })
      .leftJoin('asset as authorProfileCover', {
        'authorProfileCover.id': 'author.profileCover',
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
        'authorAvatar.path as authorAvatarPath',
        'authorProfileCover.path as authorProfileCoverPath',
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
          avatarUrl: row.authorAvatarPath
            ? this.cloudflare.genUrl(row.authorAvatarPath)
            : null,
          headerUrl: row.authorProfileCoverPath
            ? this.cloudflare.genUrl(row.authorProfileCoverPath)
            : null,
          federationSetting: row.authorFederationSetting,
        },
      }))
  }

  public async recordExportTriggerDecision({
    articleId,
    actorId = null,
    trigger,
    mode = FEDERATION_EXPORT_TRIGGER_MODE.recordOnly,
    action = resolveFederationExportAction(trigger),
  }: RecordFederationExportTriggerInput): Promise<FederationExportEvent> {
    if (
      mode !== FEDERATION_EXPORT_TRIGGER_MODE.recordOnly &&
      mode !== FEDERATION_EXPORT_TRIGGER_MODE.sqs
    ) {
      throw new Error(`Unsupported federation export trigger mode: ${mode}`)
    }

    if (!Object.values(FEDERATION_EXPORT_TRIGGER).includes(trigger)) {
      throw new Error(`Invalid federation export trigger: ${trigger}`)
    }

    const rows = await this.loadSelectedArticleRows([articleId], {
      includeFederationSettings: true,
      usePrimary: true,
    })

    if (rows.length === 0) {
      throw new Error(`Article not found for federation export: ${articleId}`)
    }

    const decisionReport = evaluateFederationExportRows({
      rows,
      enforceFederationGate: true,
    })
    const [decision] = decisionReport.decisions
    const shouldQueue =
      mode === FEDERATION_EXPORT_TRIGGER_MODE.sqs &&
      (decision.eligible || action === FEDERATION_EXPORT_ACTION.delete)
    const status =
      mode === FEDERATION_EXPORT_TRIGGER_MODE.recordOnly
        ? 'recorded'
        : shouldQueue
        ? 'queued'
        : 'skipped'

    const [row] = await this.knex('federation_export_event')
      .insert({
        articleId,
        actorId,
        trigger,
        mode,
        action,
        status,
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
        'action',
        'status',
        'eligible',
        'reason',
        'authorSetting',
        'articleSetting',
        'effectiveArticleSetting',
        'decisionReport',
      ])

    if (shouldQueue) {
      try {
        if (!QUEUE_URL.federationExport) {
          throw new ServerError(
            'MATTERS_AWS_FEDERATION_EXPORT_QUEUE_URL is required'
          )
        }
        await this.queue.sqsSendMessage({
          queueUrl: QUEUE_URL.federationExport,
          messageGroupId: articleId,
          messageDeduplicationId: row.id,
          messageBody: {
            version: 1,
            eventId: row.id,
            articleId,
            action,
            siteDomain: environment.siteDomain,
            webfDomain: environment.federationExportWebfDomain,
          },
        })
      } catch (error) {
        await this.knex('federation_export_event')
          .where({ id: row.id })
          .update({
            status: 'failed',
            updatedAt: this.knex.fn.now(),
          })
        logger.error('Failed to enqueue federation export event', {
          eventId: row.id,
          articleId,
          action,
          error,
        })
        throw new ServerError('Failed to enqueue federation export event')
      }
    }

    return row
  }

  public async recordAuthorDisableTriggers({
    userId,
    actorId,
    mode,
  }: {
    userId: string
    actorId: string
    mode: FederationExportTriggerMode
  }): Promise<FederationExportEvent[]> {
    const rows = await this.knexRO('federation_export_event as exportEvent')
      .join('article', { 'article.id': 'exportEvent.articleId' })
      .where({ 'article.authorId': userId })
      .whereIn('exportEvent.action', [
        FEDERATION_EXPORT_ACTION.create,
        FEDERATION_EXPORT_ACTION.update,
      ])
      .whereIn('exportEvent.status', ['queued', 'processing', 'delivered'])
      .distinct('exportEvent.articleId as articleId')

    const events: FederationExportEvent[] = []
    for (const { articleId } of rows) {
      events.push(
        await this.recordExportTriggerDecision({
          articleId,
          actorId,
          trigger: FEDERATION_EXPORT_TRIGGER.settingChange,
          mode,
          action: FEDERATION_EXPORT_ACTION.delete,
        })
      )
    }

    return events
  }

  public async loadSocialProfile(
    actorHandle: string
  ): Promise<FederationSocialProfile> {
    const encodedHandle = encodeURIComponent(actorHandle)
    const [profileResponse, timelineResponse] = await Promise.all([
      this.gatewayRequest<{
        actor?: {
          id?: string
          preferredUsername?: string
          name?: string
          summary?: string
          url?: string
          icon?: { url?: string }
          image?: { url?: string }
        }
        counts?: {
          followers?: number
          following?: number
          pendingFollowing?: number
          unreadNotifications?: number
        }
        limits?: {
          maxFollowingPerActor?: number
          timelineRetentionDays?: number
          timelineMaxItems?: number
        }
        following?: GatewayRemoteActorRecord[]
        notifications?: GatewayNotificationRecord[]
      }>(`/admin/social/profile?actorHandle=${encodedHandle}`),
      this.gatewayRequest<{ items?: GatewayInboundObjectRecord[] }>(
        `/admin/social/timeline?actorHandle=${encodedHandle}&limit=40`
      ),
    ])
    const actor = profileResponse.actor ?? {}

    return {
      actorId: actor.id ?? '',
      handle: actor.preferredUsername ?? actorHandle,
      account: `${actor.preferredUsername ?? actorHandle}@${
        environment.federationExportWebfDomain || environment.siteDomain
      }`,
      displayName: actor.name ?? actor.preferredUsername ?? actorHandle,
      summary: actor.summary ?? '',
      profileUrl:
        actor.url ?? `https://${environment.siteDomain}/@${actorHandle}`,
      avatarUrl: actor.icon?.url ?? null,
      headerUrl: actor.image?.url ?? null,
      followersCount: profileResponse.counts?.followers ?? 0,
      followingCount: profileResponse.counts?.following ?? 0,
      pendingFollowingCount: profileResponse.counts?.pendingFollowing ?? 0,
      unreadNotificationsCount:
        profileResponse.counts?.unreadNotifications ?? 0,
      maxFollowing: profileResponse.limits?.maxFollowingPerActor ?? 200,
      retentionDays: profileResponse.limits?.timelineRetentionDays ?? 30,
      timelineMaxItems: profileResponse.limits?.timelineMaxItems ?? 1_000,
      following: (profileResponse.following ?? [])
        .filter((entry) => entry.status !== 'blocked')
        .map(mapRemoteActor),
      notifications: (profileResponse.notifications ?? []).map(mapNotification),
      timeline: (timelineResponse.items ?? []).map(mapSocialPost),
    }
  }

  public async loadSocialUnreadCount(actorHandle: string): Promise<number> {
    const response = await this.gatewayRequest<{
      unreadNotificationsCount?: number
    }>(
      `/admin/social/unread-count?actorHandle=${encodeURIComponent(
        actorHandle
      )}`
    )
    return response.unreadNotificationsCount ?? 0
  }

  public async refreshSocialProfile(userId: string): Promise<boolean> {
    const setting = await this.loadAuthorFederationSetting(userId)
    if (setting?.state !== FEDERATION_AUTHOR_SETTING.enabled) {
      return false
    }

    const row = await this.knexRO('user as author')
      .leftJoin('asset as authorAvatar', {
        'authorAvatar.id': 'author.avatar',
      })
      .leftJoin('asset as authorProfileCover', {
        'authorProfileCover.id': 'author.profileCover',
      })
      .where('author.id', userId)
      .first([
        'author.id as authorId',
        'author.userName as userName',
        'author.displayName as displayName',
        'author.description as description',
        'author.state as state',
        'authorAvatar.path as avatarPath',
        'authorProfileCover.path as headerPath',
      ])

    if (
      !row?.userName ||
      !row.displayName ||
      row.state === USER_STATE.archived
    ) {
      return false
    }

    const handle = row.userName.trim().toLowerCase()
    const profileUrl = `https://${environment.siteDomain}/@${handle}`
    await this.gatewayRequest('/admin/actors', {
      method: 'POST',
      data: {
        handle,
        displayName: row.displayName.trim(),
        summary: row.description ?? '',
        profileUrl,
        avatarUrl: row.avatarPath
          ? this.cloudflare.genUrl(row.avatarPath)
          : null,
        headerUrl: row.headerPath
          ? this.cloudflare.genUrl(row.headerPath)
          : null,
        aliases: [profileUrl],
        updatedBy: `server-user:${userId}`,
      },
    })
    return true
  }

  public async loadArticleSocial({
    actorHandle,
    contentRef,
  }: {
    actorHandle: string
    contentRef: string
  }): Promise<FederationArticleSocial> {
    const response = await this.gatewayRequest<{
      contentId?: string | null
      content?: {
        metrics?: {
          replies?: number
          likes?: number
          announces?: number
        }
        notifications?: {
          total?: number
          unreadTotal?: number
        }
      } | null
      notifications?: GatewayNotificationRecord[]
      replies?: GatewayInboundObjectRecord[]
    }>(
      `/admin/social/article?actorHandle=${encodeURIComponent(
        actorHandle
      )}&contentRef=${encodeURIComponent(contentRef)}`
    )

    return {
      contentId: response.contentId ?? null,
      repliesCount: response.content?.metrics?.replies ?? 0,
      likesCount: response.content?.metrics?.likes ?? 0,
      announcesCount: response.content?.metrics?.announces ?? 0,
      notificationsCount:
        response.content?.notifications?.total ??
        response.notifications?.reduce(
          (total, item) => total + (item.eventCount ?? 0),
          0
        ) ??
        0,
      unreadNotificationsCount:
        response.content?.notifications?.unreadTotal ??
        response.notifications?.reduce(
          (total, item) => total + (item.unreadCount ?? 0),
          0
        ) ??
        0,
      replies: (response.replies ?? []).map(mapSocialPost),
    }
  }

  public async resolveSocialRemoteActor({
    account,
    actorId,
  }: {
    account?: string | null
    actorId?: string | null
  }): Promise<FederationSocialRemoteActor> {
    const params = new URLSearchParams()
    if (account) {
      params.set('account', account)
    }
    if (actorId) {
      params.set('actorId', actorId)
    }
    const response = await this.gatewayRequest<{
      item?: GatewayRemoteActorRecord
    }>(`/admin/social/remote-actor?${params.toString()}`)
    return mapRemoteActor(response.item ?? {})
  }

  public async runSocialAction({
    actorHandle,
    actorId,
    input,
  }: {
    actorHandle: string
    actorId: string
    input: FederationSocialActionInput
  }): Promise<FederationSocialActionResult> {
    const handle = encodeURIComponent(actorHandle)
    const commonPayload = {
      actorId: input.remoteActorId?.trim() || undefined,
      targetActorId: input.remoteActorId?.trim() || undefined,
      objectId: input.objectId?.trim() || undefined,
    }
    let path: string
    let data: Record<string, unknown>

    switch (input.action) {
      case 'follow':
        path = `/users/${handle}/outbox/follow`
        data = {
          account: input.account?.trim() || undefined,
          actorId: input.remoteActorId?.trim() || undefined,
          idempotencyKey: `follow:${actorId}:${
            input.remoteActorId?.trim() || input.account?.trim()
          }`,
        }
        break
      case 'unfollow':
        path = `/users/${handle}/outbox/undo`
        data = {
          activityId: input.activityId?.trim() || undefined,
          mapping: 'follow',
          objectId: input.remoteActorId?.trim() || undefined,
          targetActorId: input.remoteActorId?.trim() || undefined,
        }
        break
      case 'reply': {
        if (!input.content?.trim() || !input.objectId?.trim()) {
          throw new ServerError('Reply content and object are required')
        }
        const noteId = `https://${
          environment.siteDomain
        }/ap/notes/${randomUUID()}`
        path = `/users/${handle}/outbox/create`
        data = {
          object: {
            id: noteId,
            type: 'Note',
            content: `<p>${escapeHtml(input.content.trim())}</p>`,
            inReplyTo: input.objectId.trim(),
            published: new Date().toISOString(),
          },
          targetActorIds: input.remoteActorId
            ? [input.remoteActorId.trim()]
            : [],
          replyToActorId: input.remoteActorId?.trim() || undefined,
          includeFollowers: false,
          idempotencyKey: noteId,
        }
        break
      }
      case 'like':
      case 'announce':
        path = `/users/${handle}/outbox/engagement`
        data = {
          ...commonPayload,
          type: input.action === 'like' ? 'Like' : 'Announce',
          idempotencyKey: `${
            input.action
          }:${actorId}:${input.objectId?.trim()}`,
        }
        break
      case 'unlike':
      case 'unannounce':
        path = `/users/${handle}/outbox/undo`
        data = {
          activityId: input.activityId?.trim() || undefined,
          mapping: input.action === 'unlike' ? 'like' : 'announce',
          ...commonPayload,
        }
        break
      case 'block':
      case 'unblock':
        path = `/admin/social/${input.action}`
        data = {
          actorHandle,
          remoteActorId: input.remoteActorId?.trim(),
          reason: input.reason?.trim() || undefined,
          createdBy: `user:${actorId}`,
          updatedBy: `user:${actorId}`,
        }
        break
      case 'report':
        path = '/admin/social/report'
        data = {
          actorHandle,
          remoteActorId: input.remoteActorId?.trim(),
          objectId: input.objectId?.trim() || undefined,
          reason: input.reason?.trim(),
          createdBy: `user:${actorId}`,
        }
        break
      case 'mark_read':
        path = '/admin/local-notifications/read'
        data = {
          actorHandle,
          notificationIds: input.notificationIds ?? [],
          read: true,
          updatedBy: `user:${actorId}`,
        }
        break
      default:
        throw new ServerError('Unsupported Fediverse action')
    }

    const response = await this.gatewayRequest<{
      status?: string
      mapping?: string
      activityId?: string
      remoteActorId?: string
    }>(path, { method: 'POST', data })
    return {
      status: response.status ?? 'ok',
      mapping: response.mapping ?? null,
      activityId: response.activityId ?? null,
      remoteActorId:
        response.remoteActorId ?? input.remoteActorId?.trim() ?? null,
    }
  }

  public async loadGatewayDashboard(): Promise<FederationGatewayDashboard> {
    const [
      queueResponse,
      deadLetterResponse,
      auditResponse,
      socialResponse,
      reportResponse,
    ] = await Promise.all([
      this.gatewayRequest<{
        queue?: {
          summary?: Record<string, unknown>
          deadLetters?: Record<string, unknown>
        }
      }>('/admin/queues/outbound?traceLimit=20'),
      this.gatewayRequest<{ items?: Array<Record<string, unknown>> }>(
        '/admin/dead-letters?status=open&limit=50'
      ),
      this.gatewayRequest<{ items?: Array<Record<string, unknown>> }>(
        '/admin/audit-log?limit=50'
      ),
      this.gatewayRequest<{
        totals?: Record<string, unknown>
        limits?: Record<string, unknown>
      }>('/admin/social/summary'),
      this.gatewayRequest<{ items?: Array<Record<string, unknown>> }>(
        '/admin/abuse-queue?status=open'
      ),
    ])

    const summary = queueResponse.queue?.summary ?? {}
    const deadLetterSummary = queueResponse.queue?.deadLetters ?? {}
    const numberValue = (value: unknown) =>
      typeof value === 'number' ? value : 0
    const stringValue = (value: unknown) =>
      typeof value === 'string' ? value : null

    return {
      generatedAt: new Date().toISOString(),
      queue: {
        total: numberValue(summary.total),
        pending: numberValue(summary.pending),
        processing: numberValue(summary.processing),
        delivered: numberValue(summary.delivered),
        deadLetter: numberValue(summary.deadLetter),
        resolved: numberValue(summary.resolved),
        retryPending: numberValue(summary.retryPending),
        openDeadLetters: numberValue(deadLetterSummary.open),
        replayedDeadLetters: numberValue(deadLetterSummary.replayed),
        resolvedDeadLetters: numberValue(deadLetterSummary.resolved),
        oldestPendingAt: stringValue(summary.oldestPendingAt),
      },
      deadLetters: (deadLetterResponse.items ?? []).map((item) => ({
        id: (stringValue(item.id) ?? '') as GlobalId,
        status: stringValue(item.status) ?? 'unknown',
        actorHandle: stringValue(item.actorHandle),
        targetActorId: stringValue(item.targetActorId),
        activityId: stringValue(item.activityId),
        activityType: stringValue(item.activityType),
        recordedAt: stringValue(item.recordedAt),
      })),
      auditEvents: (auditResponse.items ?? []).map((item) => ({
        timestamp: stringValue(item.timestamp),
        event: stringValue(item.event) ?? 'unknown',
        actorHandle: stringValue(item.actorHandle),
        itemId: stringValue(item.itemId),
        reason: stringValue(item.reason),
      })),
      reports: (reportResponse.items ?? [])
        .filter((item) => item.category === 'user-report')
        .map((item) => ({
          id: (stringValue(item.id) ?? '') as GlobalId,
          status: stringValue(item.status) ?? 'open',
          category: stringValue(item.category) ?? 'user-report',
          actorHandle: stringValue(item.actorHandle),
          remoteActorId: stringValue(item.remoteActorId),
          remoteDomain: stringValue(item.remoteDomain),
          objectId: stringValue(item.objectId),
          reason: stringValue(item.reason),
          createdAt: stringValue(item.createdAt),
        })),
      social: {
        actors: numberValue(socialResponse.totals?.actors),
        followers: numberValue(socialResponse.totals?.followers),
        following: numberValue(socialResponse.totals?.following),
        pendingFollowing: numberValue(socialResponse.totals?.pendingFollowing),
        blocked: numberValue(socialResponse.totals?.blocked),
        unreadNotifications: numberValue(
          socialResponse.totals?.unreadNotifications
        ),
        inboundObjects: numberValue(socialResponse.totals?.inboundObjects),
        inboundEngagements: numberValue(
          socialResponse.totals?.inboundEngagements
        ),
        openReports: numberValue(socialResponse.totals?.openReports),
        maxFollowingPerActor:
          numberValue(socialResponse.limits?.maxFollowingPerActor) || 200,
        timelineRetentionDays:
          numberValue(socialResponse.limits?.timelineRetentionDays) || 30,
        timelineMaxItems:
          numberValue(socialResponse.limits?.timelineMaxItems) || 1_000,
      },
    }
  }

  public async pruneGatewaySocialData({
    operatorId,
    retentionDays,
    maxItems,
  }: {
    operatorId: string
    retentionDays?: number | null
    maxItems?: number | null
  }): Promise<boolean> {
    await this.gatewayRequest('/admin/social/prune', {
      method: 'POST',
      data: {
        retentionDays: retentionDays ?? undefined,
        maxItems: maxItems ?? undefined,
        requestedBy: `oss:${operatorId}`,
      },
    })
    return true
  }

  public async resolveGatewayAbuseCase({
    id,
    operatorId,
    resolution,
  }: {
    id: string
    operatorId: string
    resolution: string
  }): Promise<boolean> {
    await this.gatewayRequest('/admin/abuse-queue/resolve', {
      method: 'POST',
      data: {
        id,
        resolvedBy: `oss:${operatorId}`,
        resolution,
      },
    })
    return true
  }

  public async replayGatewayDeadLetter({
    id,
    operatorId,
    reason,
  }: {
    id: string
    operatorId: string
    reason?: string | null
  }): Promise<boolean> {
    await this.gatewayRequest('/admin/dead-letters/replay', {
      method: 'POST',
      data: {
        id,
        replayedBy: `oss:${operatorId}`,
        reason: reason?.trim() || 'OSS manual replay',
      },
    })
    return true
  }

  public async resolveGatewayDeadLetter({
    id,
    operatorId,
    reason,
  }: {
    id: string
    operatorId: string
    reason: string
  }): Promise<boolean> {
    await this.gatewayRequest('/admin/dead-letters/resolve', {
      method: 'POST',
      data: {
        id,
        resolvedBy: `oss:${operatorId}`,
        reason,
      },
    })
    return true
  }

  private async gatewayRequest<T = unknown>(
    path: string,
    options: { method?: 'GET' | 'POST'; data?: unknown } = {}
  ): Promise<T> {
    if (
      !environment.federationGatewayUrl ||
      !environment.federationGatewayOperatorToken
    ) {
      throw new ServerError('Federation gateway admin access is not configured')
    }

    try {
      const response = await axios.request<T>({
        baseURL: environment.federationGatewayUrl,
        url: path,
        method: options.method ?? 'GET',
        data: options.data,
        headers: {
          authorization: `Bearer ${environment.federationGatewayOperatorToken}`,
        },
        timeout: 5000,
      })
      return response.data
    } catch (error) {
      logger.error('Federation gateway admin request failed', {
        path,
        error,
      })
      throw new ServerError('Federation gateway admin request failed')
    }
  }
}

const logger = getLogger('federation-export-trigger')

const resolveFederationExportAction = (
  trigger: FederationExportTrigger
): FederationExportAction => {
  if (trigger === FEDERATION_EXPORT_TRIGGER.publishArticle) {
    return FEDERATION_EXPORT_ACTION.create
  }
  if (trigger === FEDERATION_EXPORT_TRIGGER.archiveArticle) {
    return FEDERATION_EXPORT_ACTION.delete
  }
  return FEDERATION_EXPORT_ACTION.update
}
