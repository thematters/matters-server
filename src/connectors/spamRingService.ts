import type {
  Connections,
  SpamRing,
  SpamRingMember,
  SpamRingEvent,
  SpamRingSignals,
  SpamRingStatus,
  SpamRingSeverity,
  SpamRingEventAction,
  User,
} from '#definitions/index.js'
import type { UserService } from './userService.js'
import type { Knex } from 'knex'

import {
  FEATURE_FLAG,
  FEATURE_NAME,
  USER_RESTRICTION_TYPE,
  USER_STATE,
  USER_BAN_REMARK,
} from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import { v4 } from 'uuid'

import { BaseService } from './baseService.js'

// 老帳號豁免護欄（roadmap 軸一 D 硬性）：超過任一門檻的帳號不自動凍結，改列人工複查。
// 模組級常數，便於與信任安全負責人統一調參。
export const SPAM_RING_GUARDRAIL_MAX_AGE_DAYS = 60
export const SPAM_RING_GUARDRAIL_MAX_SCORE = 5
export const SPAM_RING_GUARDRAIL_BYPASS_MIN_RING_SIZE = 10

const DAY_MS = 86400000

const parseSignals = (
  signals: SpamRing['signals'] | string | null | undefined
): SpamRingSignals => {
  if (!signals) {
    return {}
  }
  if (typeof signals !== 'string') {
    return signals
  }
  try {
    return JSON.parse(signals) ?? {}
  } catch {
    return {}
  }
}

const arrayLength = (value?: string[] | null) =>
  Array.isArray(value) ? value.length : 0

const isHighConfidenceFreezeRing = (ring: SpamRing) => {
  const signals = parseSignals(ring.signals)
  const nearDupRingSize = signals.nearDupRingSize ?? 0
  const entityRingSize = signals.entityRingSize ?? 0
  const hasExternalEntity =
    !!signals.topEntity ||
    arrayLength(signals.sampleCodes) > 0 ||
    arrayLength(signals.sampleBrands) > 0

  return (
    nearDupRingSize >= SPAM_RING_GUARDRAIL_BYPASS_MIN_RING_SIZE ||
    entityRingSize >= SPAM_RING_GUARDRAIL_BYPASS_MIN_RING_SIZE ||
    hasExternalEntity
  )
}

export interface SpamRingCandidate {
  fingerprint: string
  // 內部合約：偵測 job（讀 replica）直接帶原始 DB user id；亦可改帶 userName 由 server 解析
  memberUserIds?: string[] | null
  memberUserNames?: string[] | null
  signals?: SpamRingSignals | null
  nArticles?: number | null
  nAuthors?: number | null
  newAccountRatio?: number | null
  score?: number | null
  severity?: SpamRingSeverity | null
  firstSeenAt?: Date | string | null
  lastSeenAt?: Date | string | null
  memberEvidence?: Record<string, any> | null
}

interface RingEventInput {
  ringId: string
  memberId?: string | null
  actorId?: string | null
  action: SpamRingEventAction
  detail?: Record<string, any>
}

export class SpamRingService extends BaseService<SpamRing> {
  public constructor(connections: Connections) {
    super('spam_ring', connections)
  }

  // --- 查詢 ---
  public findRings = ({
    status,
  }: {
    status?: SpamRingStatus
  }): Knex.QueryBuilder => {
    const query = this.knexRO('spam_ring')
    if (status) {
      query.where({ status })
    }
    return query
  }

  public findRingById = (id: string): Promise<SpamRing | undefined> =>
    this.knexRO<SpamRing>('spam_ring').where({ id }).first()

  public findRingByFingerprint = (
    fingerprint: string
  ): Promise<SpamRing | undefined> =>
    this.knexRO<SpamRing>('spam_ring').where({ fingerprint }).first()

  public findMembersAndCount = async (
    ringId: string,
    { take, skip }: { take?: number; skip?: number } = {}
  ): Promise<[SpamRingMember[], number]> => {
    const countResult = await this.knexRO('spam_ring_member')
      .where({ ringId })
      .count()
      .first()
    const totalCount = parseInt((countResult?.count as string) || '0', 10)
    const members = await this.knexRO<SpamRingMember>('spam_ring_member')
      .where({ ringId })
      .orderBy('id', 'asc')
      .modify((b: Knex.QueryBuilder) => {
        if (skip !== undefined && Number.isFinite(skip)) {
          b.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          b.limit(take)
        }
      })
    return [members, totalCount]
  }

  public findMembers = (
    ringId: string,
    limit?: number
  ): Promise<SpamRingMember[]> => {
    const query = this.knexRO<SpamRingMember>('spam_ring_member')
      .where({ ringId })
      .orderBy('id', 'asc')
    if (limit !== undefined) {
      query.limit(limit)
    }
    return query
  }

  public findEvents = (ringId: string): Promise<SpamRingEvent[]> =>
    this.knexRO<SpamRingEvent>('spam_ring_event')
      .where({ ringId })
      .orderBy('createdAt', 'desc')

  // --- 偵測 job 匯入（idempotent；不覆寫已凍結/已駁回的決策）---
  public upsertCandidates = async (
    candidates: SpamRingCandidate[]
  ): Promise<{
    created: number
    updated: number
    skipped: number
    rings: SpamRing[]
    restrictedUserIds: string[]
  }> => {
    let created = 0
    let updated = 0
    let skipped = 0
    const rings: SpamRing[] = []
    const restrictedUserIds = new Set<string>()
    const restrictionEnabled = await this.isRestrictionEnabled()

    for (const c of candidates) {
      const existing = await this.findRingByFingerprint(c.fingerprint)
      if (
        existing &&
        (existing.status === 'frozen' || existing.status === 'dismissed')
      ) {
        // 決策已鎖定，不動
        skipped += 1
        rings.push(existing)
        continue
      }

      const now = new Date()
      let ring: SpamRing
      if (existing) {
        ;[ring] = await this.knex('spam_ring')
          .where({ id: existing.id })
          .update({
            signals: JSON.stringify(c.signals ?? {}),
            nArticles: c.nArticles ?? 0,
            nAuthors: c.nAuthors ?? 0,
            newAccountRatio: c.newAccountRatio ?? null,
            score: c.score ?? null,
            severity: c.severity ?? null,
            firstSeenAt: c.firstSeenAt ?? null,
            lastSeenAt: c.lastSeenAt ?? null,
            detectedAt: now,
            updatedAt: now,
          })
          .returning('*')
        updated += 1
      } else {
        ;[ring] = await this.knex('spam_ring')
          .insert({
            uuid: v4(),
            fingerprint: c.fingerprint,
            status: 'pending',
            signals: JSON.stringify(c.signals ?? {}),
            nArticles: c.nArticles ?? 0,
            nAuthors: c.nAuthors ?? 0,
            newAccountRatio: c.newAccountRatio ?? null,
            score: c.score ?? null,
            severity: c.severity ?? null,
            detectedAt: now,
            firstSeenAt: c.firstSeenAt ?? null,
            lastSeenAt: c.lastSeenAt ?? null,
          })
          .returning('*')
        created += 1
        await this.insertEvents([
          {
            ringId: ring.id,
            action: 'detected',
            detail: { source: 'job', nAuthors: c.nAuthors ?? 0 },
          },
        ])
      }

      const userIds = await this.resolveMemberIds(c)
      await this.upsertMembers(ring.id, userIds, c.memberEvidence ?? null)

      // detection-time author-level exclusion (dark, flag `spam_ring_restriction`):
      // members drop out of channels / newest / hottest while pending human
      // review — covers guardrail-skipped members auto-freeze cannot touch.
      // pending only: a restored ring re-surfacing must not override the
      // admin's restore decision
      if (restrictionEnabled && ring.status === 'pending') {
        const restricted = await this.applyMemberRestrictions(userIds)
        restricted.forEach((id) => restrictedUserIds.add(id))
      }
      rings.push(ring)
    }

    return {
      created,
      updated,
      skipped,
      rings,
      restrictedUserIds: Array.from(restrictedUserIds),
    }
  }

  // --- 一鍵凍結（永久但可逆的封禁）---
  public freezeRing = async ({
    ringId,
    actorId,
    remark,
    memberUserIds,
    userService,
  }: {
    ringId: string
    actorId: string
    remark?: string | null
    // 稽核 F1：本次偵測驗證過的成員（raw DB user id）。有給時凍結只作用於
    // 「ring 成員 ∩ 此名單」；名單外成員記 skipped、不凍結、不發通知。
    // 不給＝現行為（全成員，控制台人工一鍵）。
    memberUserIds?: string[] | null
    userService: UserService
  }): Promise<{
    ring: SpamRing
    frozen: User[]
    skipped: Array<{ user: User; reason: string }>
  }> => {
    // provided-but-empty is almost certainly a caller bug: it would mark every
    // member skipped and still lock the ring as frozen — reject it instead.
    if (memberUserIds && memberUserIds.length === 0) {
      throw new UserInputError('memberUserIds must not be empty when provided')
    }
    const memberScope = memberUserIds
      ? new Set(memberUserIds.map((id) => String(id)))
      : null

    const frozen: User[] = []
    const skipped: Array<{ user: User; reason: string }> = []

    // 整個凍結（逐成員 + ring 狀態）包在一個交易裡，並對 ring 列 FOR UPDATE：
    //   - 原子性：中途失敗整批 rollback，不會留下「成員已凍但 ring 仍 pending」（稽核 F3）
    //   - 序列化：並發 freeze/unfreeze/dismiss 互斥，不再重複處置／重複事件（F4）
    //   - 新鮮讀：成員 user.state 在鎖內直接讀主庫（FOR UPDATE），不走 request 快取 loader（F2）
    const updatedRing = await this.knex.transaction(async (trx) => {
      const ring = (await this.knex('spam_ring')
        .transacting(trx)
        .forUpdate()
        .where({ id: ringId })
        .first()) as SpamRing | undefined
      if (!ring) {
        throw new UserInputError('spam ring not found')
      }
      if (ring.status === 'dismissed') {
        throw new UserInputError('cannot freeze a dismissed ring')
      }
      if (ring.status === 'frozen') {
        // 已在鎖內確認凍結 → idempotent no-op（成員早已處理）
        return ring
      }

      const members = (await this.knex('spam_ring_member')
        .transacting(trx)
        .where({ ringId })
        .orderBy('id', 'asc')) as SpamRingMember[]
      // informational only: a high-confidence ring no longer bypasses the
      // old-account / high-karma guard — established accounts always go to
      // human review even in high-confidence rings.
      const highConfidence = isHighConfidenceFreezeRing(ring)

      for (const member of members) {
        const user = (await this.knex('user')
          .transacting(trx)
          .forUpdate()
          .where({ id: member.userId })
          .first()) as User | undefined

        if (!user) {
          await this.updateMember(
            member.id,
            { status: 'skipped', skipReason: 'user not found' },
            trx
          )
          continue
        }
        // 本 ring 已凍結過此人 → idempotent，略過
        if (member.status === 'frozen' && member.bannedByThisRing) {
          frozen.push(user)
          continue
        }
        // 稽核 F1：spam_ring_member 是歷次偵測的聯集（只增不減），可能含
        // 歷史誤列的真人。成員不在本次驗證名單 → 只記 skipped，不凍結、
        // 不發通知；下方既有護欄只對名單內成員照跑。
        if (memberScope && !memberScope.has(String(member.userId))) {
          await this.skipMember(
            member.id,
            user,
            'not_in_verified_candidate',
            actorId,
            ringId,
            trx
          )
          skipped.push({ user, reason: 'not_in_verified_candidate' })
          continue
        }
        if (user.state === USER_STATE.archived) {
          await this.skipMember(
            member.id,
            user,
            'archived',
            actorId,
            ringId,
            trx
          )
          skipped.push({ user, reason: 'archived' })
          continue
        }
        if (user.state === USER_STATE.banned) {
          await this.skipMember(
            member.id,
            user,
            'already banned',
            actorId,
            ringId,
            trx
          )
          skipped.push({ user, reason: 'already banned' })
          continue
        }
        if (user.state === USER_STATE.frozen) {
          // already frozen (by admin or another ring) → don't re-claim it,
          // otherwise unfreeze would lift a freeze this ring didn't cause.
          await this.skipMember(
            member.id,
            user,
            'already frozen',
            actorId,
            ringId,
            trx
          )
          skipped.push({ user, reason: 'already frozen' })
          continue
        }

        // 硬性護欄：老帳號（帳齡 > 60 天）或高 karma 一律不自動凍結、改送人工，
        // 高信心 ring 也不例外——避免誤判時把既有真實用戶直接凍掉。
        const ageDays =
          (Date.now() - new Date(user.createdAt).getTime()) / DAY_MS
        const score = await userService.findScore(user.id)
        if (
          ageDays > SPAM_RING_GUARDRAIL_MAX_AGE_DAYS ||
          score > SPAM_RING_GUARDRAIL_MAX_SCORE
        ) {
          const reason =
            ageDays > SPAM_RING_GUARDRAIL_MAX_AGE_DAYS
              ? `old account (age ${Math.floor(
                  ageDays
                )}d > ${SPAM_RING_GUARDRAIL_MAX_AGE_DAYS}d)`
              : `high karma (score ${score} > ${SPAM_RING_GUARDRAIL_MAX_SCORE})`
          await this.skipMember(member.id, user, reason, actorId, ringId, trx)
          skipped.push({ user, reason })
          continue
        }

        // 永久但可逆的凍結：設 state='frozen'（與一般凍結同狀態，不寫 punish_record、
        // 無到期）；freezeUser 會發 user_frozen 申訴通知，維持可申訴。
        const frozenUser = (await userService.freezeUser(user.id, {
          remark: USER_BAN_REMARK.spamRing,
          trx,
          actorId,
          source: 'model_assisted',
          automationRole: 'assisted',
          reason: 'spam',
        })) as User
        await this.updateMember(
          member.id,
          {
            status: 'frozen',
            bannedByThisRing: true,
            preFreezeState: user.state,
            skipReason: null,
          },
          trx
        )
        await this.insertEvents(
          [{ ringId, memberId: member.id, actorId, action: 'member_frozen' }],
          trx
        )
        frozen.push(frozenUser)
      }

      const now = new Date()
      const [ring2] = await this.knex('spam_ring')
        .transacting(trx)
        .where({ id: ringId })
        .update({
          status: 'frozen',
          frozenAt: now,
          frozenBy: actorId,
          updatedAt: now,
        })
        .returning('*')
      await this.insertEvents(
        [
          {
            ringId,
            actorId,
            action: 'frozen',
            detail: {
              remark: remark ?? null,
              frozen: frozen.length,
              skipped: skipped.length,
              highConfidence,
            },
          },
        ],
        trx
      )
      return ring2 as SpamRing
    })

    return { ring: updatedRing, frozen, skipped }
  }

  // --- 解除凍結（只還原「本 ring 凍結造成的」封禁）---
  public unfreezeRing = async ({
    ringId,
    actorId,
    userService,
  }: {
    ringId: string
    actorId: string
    userService: UserService
  }): Promise<{
    ring: SpamRing
    unbanned: User[]
    skipped: Array<{ user: User; reason: string }>
  }> => {
    const unbanned: User[] = []
    const skipped: Array<{ user: User; reason: string }> = []

    // 同 freezeRing：包進交易、ring 列 FOR UPDATE、成員 user.state 鎖內新鮮讀。
    const updatedRing = await this.knex.transaction(async (trx) => {
      const ring = (await this.knex('spam_ring')
        .transacting(trx)
        .forUpdate()
        .where({ id: ringId })
        .first()) as SpamRing | undefined
      if (!ring) {
        throw new UserInputError('spam ring not found')
      }
      if (ring.status !== 'frozen') {
        throw new UserInputError('spam ring is not frozen')
      }

      const members = (await this.knex('spam_ring_member')
        .transacting(trx)
        .where({ ringId })
        .orderBy('id', 'asc')) as SpamRingMember[]

      for (const member of members) {
        if (!member.bannedByThisRing) {
          continue
        }
        const user = (await this.knex('user')
          .transacting(trx)
          .forUpdate()
          .where({ id: member.userId })
          .first()) as User | undefined
        if (!user) {
          continue
        }
        // freeze 後狀態又被改動（例如被封存/封禁）→ 不復活，僅記錄
        if (user.state !== USER_STATE.frozen) {
          const reason = `state changed to ${user.state}`
          await this.updateMember(
            member.id,
            { status: 'skipped', skipReason: reason },
            trx
          )
          skipped.push({ user, reason })
          continue
        }
        // 還原成凍結前的狀態（preFreezeState，通常為 active）
        const restored = (await userService.unfreezeUser(
          user.id,
          member.preFreezeState ?? USER_STATE.active,
          trx,
          { actorId }
        )) as User
        await this.updateMember(
          member.id,
          { status: 'restored', bannedByThisRing: false },
          trx
        )
        await this.insertEvents(
          [{ ringId, memberId: member.id, actorId, action: 'member_restored' }],
          trx
        )
        unbanned.push(restored)
      }

      // restore also lifts the detection-time author-level exclusion
      await this.liftMemberRestrictions(ringId, trx)

      const now = new Date()
      const [ring2] = await this.knex('spam_ring')
        .transacting(trx)
        .where({ id: ringId })
        .update({ status: 'restored', updatedAt: now })
        .returning('*')
      await this.insertEvents(
        [
          {
            ringId,
            actorId,
            action: 'unfrozen',
            detail: { unbanned: unbanned.length },
          },
        ],
        trx
      )
      return ring2 as SpamRing
    })

    return { ring: updatedRing, unbanned, skipped }
  }

  // --- 標記誤判（餵 L1 訓練當 hard-negative ham）---
  public dismissRing = async ({
    ringId,
    actorId,
    note,
  }: {
    ringId: string
    actorId: string
    note?: string | null
  }): Promise<SpamRing> => {
    const ring = await this.findRingById(ringId)
    if (!ring) {
      throw new UserInputError('spam ring not found')
    }
    const now = new Date()
    const [updatedRing] = await this.knex('spam_ring')
      .where({ id: ringId })
      .update({ status: 'dismissed', note: note ?? null, updatedAt: now })
      .returning('*')
    // dismissal = false positive: lift the detection-time exclusion
    await this.liftMemberRestrictions(ringId)
    await this.insertEvents([
      { ringId, actorId, action: 'dismissed', detail: { note: note ?? null } },
    ])
    return updatedRing
  }

  // --- 偵測即作者級排除（SPEC-blackhouse-permanent-and-auto §2-D）---

  // flag read is viewer-independent (detection job runs headless), so query
  // the row directly instead of systemService.isFeatureEnabled
  private isRestrictionEnabled = async (): Promise<boolean> => {
    const flag = await this.knexRO('feature_flag')
      .where({
        name: FEATURE_NAME.spam_ring_restriction,
        flag: FEATURE_FLAG.on,
      })
      .first()
    return !!flag
  }

  // returns the userIds that had a restriction newly written, so the caller
  // can purge their content caches (an already-restricted member is a no-op)
  private applyMemberRestrictions = async (
    userIds: string[]
  ): Promise<string[]> => {
    const restricted: string[] = []
    for (const userId of userIds) {
      const existing = await this.knexRO('user_restriction')
        .where({ userId, type: USER_RESTRICTION_TYPE.spamRing })
        .first()
      if (existing) {
        continue
      }
      await this.knex('user_restriction').insert({
        userId,
        type: USER_RESTRICTION_TYPE.spamRing,
      })
      restricted.push(userId)
    }
    return restricted
  }

  // lift the spamRing restriction of this ring's members, unless a member
  // also belongs to another ring that is still detected (pending / frozen) —
  // dismissing one ring must not unhide a user another ring still flags.
  // runs regardless of the feature flag so turning the flag off later still
  // lets dismiss/restore clean up rows written while it was on.
  private liftMemberRestrictions = async (
    ringId: string,
    trx?: Knex.Transaction
  ): Promise<void> => {
    const memberQuery = this.knex('spam_ring_member')
      .where({ ringId })
      .select('userId')
    if (trx) {
      memberQuery.transacting(trx)
    }
    const memberRows = await memberQuery
    const memberIds = Array.from(
      new Set(memberRows.map((r: { userId: string }) => String(r.userId)))
    )
    if (memberIds.length === 0) {
      return
    }
    // members still flagged by another ring that is actively detected
    // (pending / frozen) — their restriction must stay
    const activeRingIds = this.knex('spam_ring')
      .whereIn('status', ['pending', 'frozen'])
      .select('id')
    const otherQuery = this.knex('spam_ring_member')
      .whereIn('userId', memberIds)
      .whereNot('ringId', ringId)
      .whereIn('ringId', activeRingIds)
      .select('userId')
    if (trx) {
      otherQuery.transacting(trx)
    }
    const otherRows = await otherQuery
    const stillDetected = new Set(
      otherRows.map((r: { userId: string }) => String(r.userId))
    )
    const toLift = memberIds.filter((id) => !stillDetected.has(id))
    if (toLift.length === 0) {
      return
    }
    const delQuery = this.knex('user_restriction')
      .whereIn('userId', toLift)
      .where({ type: USER_RESTRICTION_TYPE.spamRing })
      .del()
    if (trx) {
      delQuery.transacting(trx)
    }
    await delQuery
  }

  // --- 私有輔助 ---
  private resolveMemberIds = async (
    c: SpamRingCandidate
  ): Promise<string[]> => {
    if (c.memberUserIds && c.memberUserIds.length > 0) {
      return Array.from(new Set(c.memberUserIds.map((id) => String(id))))
    }
    if (c.memberUserNames && c.memberUserNames.length > 0) {
      const rows = await this.knexRO('user')
        .whereIn('userName', c.memberUserNames)
        .select('id')
      return Array.from(new Set(rows.map((r: { id: string }) => String(r.id))))
    }
    return []
  }

  private upsertMembers = async (
    ringId: string,
    userIds: string[],
    evidence: Record<string, any> | null
  ): Promise<void> => {
    for (const userId of userIds) {
      const existing = await this.knexRO('spam_ring_member')
        .where({ ringId, userId })
        .first()
      if (existing) {
        // 不擾動已存在 member（含已 frozen/skipped/restored）
        continue
      }
      await this.knex('spam_ring_member').insert({
        uuid: v4(),
        ringId,
        userId,
        status: 'pending',
        bannedByThisRing: false,
        evidence: JSON.stringify((evidence && evidence[userId]) || {}),
      })
    }
  }

  private updateMember = async (
    id: string,
    patch: Partial<{
      status: string
      bannedByThisRing: boolean
      skipReason: string | null
      preFreezeState: string
    }>,
    trx?: Knex.Transaction
  ): Promise<void> => {
    const query = this.knex('spam_ring_member')
      .where({ id })
      .update({ ...patch, updatedAt: new Date() })
    if (trx) {
      query.transacting(trx)
    }
    await query
  }

  private skipMember = async (
    memberId: string,
    user: User,
    reason: string,
    actorId: string,
    ringId: string,
    trx?: Knex.Transaction
  ): Promise<void> => {
    await this.updateMember(
      memberId,
      {
        status: 'skipped',
        skipReason: reason,
        bannedByThisRing: false,
        preFreezeState: user.state,
      },
      trx
    )
    await this.insertEvents(
      [
        {
          ringId,
          memberId,
          actorId,
          action: 'member_skipped',
          detail: { reason },
        },
      ],
      trx
    )
  }

  private insertEvents = async (
    events: RingEventInput[],
    trx?: Knex.Transaction
  ): Promise<void> => {
    const now = new Date()
    const query = this.knex('spam_ring_event').insert(
      events.map((e) => ({
        uuid: v4(),
        ringId: e.ringId,
        memberId: e.memberId ?? null,
        actorId: e.actorId ?? null,
        action: e.action,
        detail: JSON.stringify(e.detail ?? {}),
        createdAt: now,
      }))
    )
    if (trx) {
      query.transacting(trx)
    }
    await query
  }
}
