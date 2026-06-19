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
import type { Knex } from 'knex'

import { USER_STATE, USER_BAN_REMARK } from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import { v4 } from 'uuid'

import { BaseService } from './baseService.js'
import { UserService } from './userService.js'

// 老帳號豁免護欄（roadmap 軸一 D 硬性）：超過任一門檻的帳號不自動凍結，改列人工複查。
// 模組級常數，便於與信任安全負責人統一調參。
export const SPAM_RING_GUARDRAIL_MAX_AGE_DAYS = 30
export const SPAM_RING_GUARDRAIL_MAX_SCORE = 5

const DAY_MS = 86400000

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
  }> => {
    let created = 0
    let updated = 0
    let skipped = 0
    const rings: SpamRing[] = []

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
      rings.push(ring)
    }

    return { created, updated, skipped, rings }
  }

  // --- 一鍵凍結（永久但可逆的封禁）---
  public freezeRing = async ({
    ringId,
    actorId,
    remark,
  }: {
    ringId: string
    actorId: string
    remark?: string | null
  }): Promise<{
    ring: SpamRing
    frozen: User[]
    skipped: Array<{ user: User; reason: string }>
  }> => {
    const ring = await this.findRingById(ringId)
    if (!ring) {
      throw new UserInputError('spam ring not found')
    }
    if (ring.status === 'dismissed') {
      throw new UserInputError('cannot freeze a dismissed ring')
    }

    const userService = new UserService(this.connections)
    const members = await this.findMembers(ringId)
    const frozen: User[] = []
    const skipped: Array<{ user: User; reason: string }> = []

    for (const member of members) {
      const user = (await this.models.userIdLoader.load(
        member.userId
      )) as User | null

      if (!user) {
        await this.updateMember(member.id, {
          status: 'skipped',
          skipReason: 'user not found',
        })
        continue
      }
      // 本 ring 已凍結過此人 → idempotent，略過
      if (member.status === 'frozen' && member.bannedByThisRing) {
        frozen.push(user)
        continue
      }
      if (user.state === USER_STATE.archived) {
        await this.skipMember(member.id, user, 'archived', actorId, ringId)
        skipped.push({ user, reason: 'archived' })
        continue
      }
      if (user.state === USER_STATE.banned) {
        await this.skipMember(member.id, user, 'already banned', actorId, ringId)
        skipped.push({ user, reason: 'already banned' })
        continue
      }

      // 老帳號 / 高 karma 豁免（硬性護欄）
      const ageDays = (Date.now() - new Date(user.createdAt).getTime()) / DAY_MS
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
        await this.skipMember(member.id, user, reason, actorId, ringId)
        skipped.push({ user, reason })
        continue
      }

      // 永久但可逆封禁：省略 banDays → 不寫 punish_record、無到期；仍發 user_banned 申訴通知
      const banned = (await userService.banUser(user.id, {
        remark: USER_BAN_REMARK.spamRing,
      })) as User
      await this.updateMember(member.id, {
        status: 'frozen',
        bannedByThisRing: true,
        preFreezeState: user.state,
        skipReason: null,
      })
      await this.insertEvents([
        { ringId, memberId: member.id, actorId, action: 'member_banned' },
      ])
      frozen.push(banned)
    }

    const now = new Date()
    const [updatedRing] = await this.knex('spam_ring')
      .where({ id: ringId })
      .update({
        status: 'frozen',
        frozenAt: now,
        frozenBy: actorId,
        updatedAt: now,
      })
      .returning('*')
    await this.insertEvents([
      {
        ringId,
        actorId,
        action: 'frozen',
        detail: {
          remark: remark ?? null,
          frozen: frozen.length,
          skipped: skipped.length,
        },
      },
    ])

    return { ring: updatedRing, frozen, skipped }
  }

  // --- 解除凍結（只還原「本 ring 凍結造成的」封禁）---
  public unfreezeRing = async ({
    ringId,
    actorId,
  }: {
    ringId: string
    actorId: string
  }): Promise<{
    ring: SpamRing
    unbanned: User[]
    skipped: Array<{ user: User; reason: string }>
  }> => {
    const ring = await this.findRingById(ringId)
    if (!ring) {
      throw new UserInputError('spam ring not found')
    }
    if (ring.status !== 'frozen') {
      throw new UserInputError('spam ring is not frozen')
    }

    const userService = new UserService(this.connections)
    const members = await this.findMembers(ringId)
    const unbanned: User[] = []
    const skipped: Array<{ user: User; reason: string }> = []

    for (const member of members) {
      if (!member.bannedByThisRing) {
        continue
      }
      const user = (await this.models.userIdLoader.load(
        member.userId
      )) as User | null
      if (!user) {
        continue
      }
      // freeze 後狀態已變（例如被封存）→ 不復活，僅記錄
      if (user.state !== USER_STATE.banned) {
        const reason = `state changed to ${user.state}`
        await this.updateMember(member.id, { status: 'skipped', skipReason: reason })
        skipped.push({ user, reason })
        continue
      }
      const restored = (await userService.unbanUser(
        user.id,
        USER_STATE.active
      )) as User
      await this.updateMember(member.id, {
        status: 'restored',
        bannedByThisRing: false,
      })
      await this.insertEvents([
        { ringId, memberId: member.id, actorId, action: 'member_restored' },
      ])
      unbanned.push(restored)
    }

    const now = new Date()
    const [updatedRing] = await this.knex('spam_ring')
      .where({ id: ringId })
      .update({ status: 'restored', updatedAt: now })
      .returning('*')
    await this.insertEvents([
      { ringId, actorId, action: 'unfrozen', detail: { unbanned: unbanned.length } },
    ])

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
    await this.insertEvents([
      { ringId, actorId, action: 'dismissed', detail: { note: note ?? null } },
    ])
    return updatedRing
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
    }>
  ): Promise<void> => {
    await this.knex('spam_ring_member')
      .where({ id })
      .update({ ...patch, updatedAt: new Date() })
  }

  private skipMember = async (
    memberId: string,
    user: User,
    reason: string,
    actorId: string,
    ringId: string
  ): Promise<void> => {
    await this.updateMember(memberId, {
      status: 'skipped',
      skipReason: reason,
      bannedByThisRing: false,
      preFreezeState: user.state,
    })
    await this.insertEvents([
      { ringId, memberId, actorId, action: 'member_skipped', detail: { reason } },
    ])
  }

  private insertEvents = async (events: RingEventInput[]): Promise<void> => {
    const now = new Date()
    await this.knex('spam_ring_event').insert(
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
  }
}
