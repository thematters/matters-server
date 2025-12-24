import type {
  Connections,
  LANGUAGES,
  UserRetentionStateToMail,
  UserRetentionStateToMark,
  UserRetentionState,
} from '#definitions/index.js'
import type { Knex } from 'knex'

import { DAY } from '#common/enums/index.js'
import { environment, isProd } from '#common/environment.js'

import { mailService } from './mail/index.js'
import { RecommendationService } from './recommendationService.js'

export type SendmailFn = (
  userId: string,
  lastSeen: Date | null,
  type: UserRetentionStateToMail
) => Promise<void>

type UserInfo = {
  displayName: string
  email: string
  emailVerified: boolean
  language: LANGUAGES
  createdAt: Date
  state: string
}

type RecommendedUser = {
  id: string
  userName: string
  displayName: string
}

type RecommendedArticle = {
  id: string
  title: string
  displayName: string
  shortHash: string
}

const siteDomain = environment.siteDomain || ''

export class UserRetentionService {
  private connections: Connections
  private knex: Knex
  private knexRO: Knex

  public constructor(connections: Connections) {
    this.connections = connections
    this.knex = connections.knex
    this.knexRO = connections.knexRO
  }

  public processUserRetention = async ({
    intervalInDays,
    sendmail,
  }: {
    intervalInDays: number
    sendmail: SendmailFn
  }) => {
    await this.markNewUsers()
    await this.markActiveUsers()

    // fetch needed users data to check and change retention state
    console.time('fetchUsersData')
    const users = await this.fetchUsersData()
    console.timeEnd('fetchUsersData')
    console.log(`users num: ${users.length}`)

    const now = new Date()
    const intervalInMs = intervalInDays * 86400000
    console.log({ intervalInMs })

    console.time('loop')
    for (const { userId, state, stateUpdatedAt, lastSeen } of users) {
      const stateDuration = +now - +stateUpdatedAt
      if (lastSeen > stateUpdatedAt) {
        await this.markUserState(userId, 'NORMAL')
      } else if (stateDuration > intervalInMs) {
        switch (state) {
          case 'NEWUSER':
            await sendmail(userId, lastSeen, 'NEWUSER')
            break
          case 'ACTIVE':
            await sendmail(userId, lastSeen, 'ACTIVE')
            break
          case 'ALERT':
            await this.markUserState(userId, 'INACTIVE')
            break
        }
      }
      // else stateDuration < intervalInMs , do nothing
    }
    console.timeEnd('loop')
  }

  private markNewUsers = async () => {
    console.time('markNewUsers')
    await this.knex.raw(`
      INSERT INTO user_retention_history (user_id, state)
      SELECT id, 'NEWUSER' FROM public.user
      WHERE
        created_at >= (CURRENT_TIMESTAMP - '2 day'::interval)
        AND id NOT IN (SELECT user_id FROM user_retention_history);
    `)
    console.timeEnd('markNewUsers')
  }

  private markActiveUsers = async () => {
    // active users from existed users
    console.time('markActiveUsers1')
    await this.knex.raw(`
      INSERT INTO user_retention_history (user_id, state)
      -- users read 0.1+ hours last 2 month
      SELECT user_id, 'ACTIVE'
        FROM article_read_count
        WHERE created_at > (CURRENT_TIMESTAMP - '60 days'::interval )
        GROUP BY user_id
        HAVING sum(read_time) >= 360 -- 0.1 hours
      -- users post 1+ articles last 2 month
      UNION SELECT author_id AS user_id, 'ACTIVE'
        FROM article
        WHERE created_at >= (CURRENT_TIMESTAMP - '60 days'::interval)
        GROUP BY author_id
        HAVING count(id) >= 1
      -- except marked users
      EXCEPT SELECT user_id, 'ACTIVE'
        FROM user_retention_history;
    `)
    console.timeEnd('markActiveUsers1')

    // active users from NORMAL, INACTIVE pool
    console.time('markActiveUsers2')
    await this.knex.raw(`
      -- helper table contains: users whose latest retention state are NORMAL / INACTIVE
      WITH user_retention AS (
        SELECT ranked.user_id, ranked.state, ranked.created_at
        FROM (
          SELECT user_id, state, created_at, rank() OVER(PARTITION BY user_id ORDER BY id DESC) AS rank FROM user_retention_history
        ) AS ranked
        WHERE ranked.rank = 1 AND ranked.state IN ('NORMAL', 'INACTIVE')
      )
      INSERT INTO user_retention_history (user_id, state)
      -- users whose latest retention state are NORMAL / INACTIVE
      SELECT user_id, 'ACTIVE' FROM user_retention
      -- intersect users have enough activities since marked NORMAL / INACTIVE
      INTERSECT (
        SELECT article_read_count.user_id, 'ACTIVE'
          FROM article_read_count,user_retention
          WHERE
            article_read_count.user_id=user_retention.user_id
            AND article_read_count.created_at >= user_retention.created_at
          GROUP BY article_read_count.user_id
          HAVING sum(read_time) >= 360 -- 0.1 hours
        UNION SELECT author_id AS user_id, 'ACTIVE'
          FROM article, user_retention
          WHERE
            article.author_id = user_retention.user_id
            AND article.created_at >= user_retention.created_at
          GROUP BY article.author_id
          HAVING count(article.id) >= 1
      );
    `)
    console.timeEnd('markActiveUsers2')
  }

  private fetchUsersData = async () => {
    const latestRetentionStates = this.knexRO
      .select('user_id', 'state', 'created_at')
      .from(
        this.knexRO
          .select(
            'user_id',
            'state',
            'created_at',
            this.knexRO.raw(
              'rank() OVER(PARTITION BY user_id ORDER BY id DESC) AS rank'
            )
          )
          .from('user_retention_history')
          .as('ranked')
      )
      .where('rank', 1)
      .whereIn('state', ['NEWUSER', 'ACTIVE', 'ALERT'])
      .as('user_retention')

    return await this.knexRO
      .select(
        'user_retention.user_id',
        'user_retention.state',
        { state_updated_at: 'user_retention.created_at' },
        'user.last_seen'
      )
      .from(latestRetentionStates)
      .join('user', 'user_retention.user_id', 'user.id')
      .where('user.state', 'active')
  }

  public markUserState = async (
    userId: string,
    state: UserRetentionStateToMark
  ) => {
    await this.knex('user_retention_history').insert({
      userId,
      state,
    })
  }

  public loadUserRetentionState = async (
    userId: string
  ): Promise<UserRetentionState> => {
    const result = await this.knexRO.raw(
      `
      SELECT state, rank
      FROM
        (
          SELECT state, rank() OVER(PARTITION BY user_id ORDER BY id DESC) AS rank
          FROM user_retention_history
          WHERE user_id=?
        ) AS ranked
      WHERE rank=1
    `,
      [userId]
    )

    return result.rows[0]?.state
  }

  public sendmail = async (
    userId: string,
    lastSeen: Date,
    type: UserRetentionStateToMail
  ) => {
    const retentionState = await this.loadUserRetentionState(userId)
    if (retentionState !== type) {
      console.warn(
        `Unexpected user retention state: ${retentionState}, sendmail quit.`
      )
      return
    }

    const userInfo = await this.loadUserInfo(userId)
    if (!userInfo.email || !userInfo.emailVerified) {
      console.warn(`User ${userId} has no verified email, sendmail quit.`)
      return
    }

    const goodState = ['onboarding', 'active']
    if (!goodState.includes(userInfo.state)) {
      console.warn(`Unexpected user state: ${userInfo.state}, sendmail quit.`)
      return
    }

    const subject = this.getSubject(
      userInfo.displayName,
      type,
      userInfo.language
    )
    const recipient = {
      displayName: userInfo.displayName,
      days: this.getDays(userInfo.createdAt),
    }

    const [
      numDonations,
      numAppreciations,
      usersRecommended,
      articlesNewFeature,
    ] = await Promise.all([
      this.loadNumDonations(userId),
      this.loadNumAppreciations(userId),
      this.loadRecommendedUsers(userId, 3),
      this.loadNewFeatureArticles(environment.newFeatureTagId, 1),
    ])

    const excludeNewFeatureArticlesIds = articlesNewFeature.map(({ id }) => id)
    const articlesRecommended = await this.loadRecommendedArticles(
      userId,
      lastSeen,
      3,
      excludeNewFeatureArticlesIds
    )
    const articlesHottest =
      articlesRecommended.length === 0
        ? await this.loadHottestArticles(
            userId,
            3,
            excludeNewFeatureArticlesIds
          )
        : []

    await mailService.send({
      from: environment.emailFromAsk as string,
      templateId: this.getTemplateId(userInfo.language),
      personalizations: [
        {
          to: userInfo.email,
          // @ts-ignore
          dynamic_template_data: {
            subject,
            siteDomain,
            recipient,
            type,
            articlesRecommended,
            articlesHottest,
            numDonations,
            numAppreciations,
            usersRecommended,
            articlesNewFeature,
          },
        },
      ],
    })

    await this.markUserState(userId, 'ALERT')
  }

  private loadUserInfo = async (userId: string): Promise<UserInfo> => {
    const result = await this.knexRO('user')
      .select(
        'displayName',
        'email',
        'emailVerified',
        'language',
        'createdAt',
        'state'
      )
      .where('id', userId)
      .first()

    return result as UserInfo
  }

  public loadRecommendedArticles = async (
    userId: string,
    lastSeen: Date,
    limit: number,
    excludedArticleIds: string[]
  ) => {
    const articles = await this.loadDoneeHotArticles(
      userId,
      lastSeen,
      limit,
      excludedArticleIds
    )
    if (articles.length < limit) {
      return articles.concat(
        await this.loadFolloweeHotArticles(
          userId,
          lastSeen,
          limit - articles.length,
          excludedArticleIds.concat(articles.map(({ id }) => id))
        )
      )
    } else {
      return articles
    }
  }

  public loadHottestArticles = async (
    userId: string,
    limit: number,
    excludedArticleIds: string[]
  ): Promise<RecommendedArticle[]> => {
    const recommendationService = new RecommendationService(this.connections)
    const hottestArticleIds = (
      await recommendationService.findHottestArticles({
        days: environment.hottestArticlesDays,
        decayDays: environment.hottestArticlesDecayDays,
        HKDThreshold: environment.hottestArticlesHKDThreshold,
        USDTThreshold: environment.hottestArticlesUSDTThreshold,
        readWeight: environment.hottestArticlesReadWeight,
        commentWeight: environment.hottestArticlesCommentWeight,
        donationWeight: environment.hottestArticlesDonationWeight,
        readersThreshold: environment.hottestArticlesReadersThreshold,
        commentsThreshold: environment.hottestArticlesCommentsThreshold,
      })
    ).map(({ articleId }) => articleId)
    const query = this.knexRO('article')
      .select('article.id', 'avn.title', 'u.display_name', 'article.short_hash')
      .join('article_version_newest as avn', 'article.id', 'avn.article_id')
      .join('user as u', 'article.author_id', 'u.id')
      .whereRaw(
        'article.id NOT IN (SELECT article_id FROM article_read_count WHERE user_id = ?)',
        [userId]
      )
      .whereIn('article.id', hottestArticleIds)
      .whereNot('article.author_id', userId)
      .limit(limit)

    if (excludedArticleIds.length > 0) {
      query.whereNotIn('article.id', excludedArticleIds)
    }

    return await query
  }

  private loadNumDonations = async (userId: string): Promise<number> => {
    const result = await this.knexRO('transaction')
      .count('* as count')
      .where('purpose', 'donation')
      .where('state', 'succeeded')
      .where('recipientId', userId)
      .first()

    return +(result?.count || 0)
  }

  private loadNumAppreciations = async (userId: string): Promise<number> => {
    const result = await this.knexRO('appreciation')
      .sum('amount as sum')
      .where('purpose', 'appreciate')
      .where('recipientId', userId)
      .first()

    return +(result?.sum || 0)
  }

  private loadRecommendedUsers = async (
    userId: string,
    limit: number
  ): Promise<RecommendedUser[]> => {
    return await this.knexRO('user as u')
      .select('u.id', 'u.user_name', 'u.display_name')
      .leftOuterJoin(
        this.knexRO('transaction')
          .select('sender_id', this.knexRO.raw('COUNT(*) as num_donations'))
          .where('recipient_id', userId)
          .where('purpose', 'donation')
          .where('state', 'succeeded')
          .groupBy('sender_id')
          .as('user_donation'),
        'u.id',
        'user_donation.sender_id'
      )
      .leftOuterJoin(
        this.knexRO('appreciation')
          .select('sender_id', this.knexRO.raw('COUNT(*) as num_appreciations'))
          .where('recipient_id', userId)
          .where('purpose', 'appreciate')
          .groupBy('sender_id')
          .as('user_appreciation'),
        'u.id',
        'user_appreciation.sender_id'
      )
      .leftOuterJoin(
        this.knexRO('action_user')
          .select('user_id', 'created_at as follow_at')
          .where('action', 'follow')
          .where('target_id', userId)
          .as('user_follower'),
        'u.id',
        'user_follower.user_id'
      )
      .leftOuterJoin(
        this.knexRO('action_user')
          .select('target_id', this.knexRO.raw('1 as is_followee'))
          .where('action', 'follow')
          .where('user_id', userId)
          .as('user_followee'),
        'u.id',
        'user_followee.target_id'
      )
      .whereIn('u.state', ['active', 'onboarding'])
      .where(function () {
        this.whereRaw('user_donation.num_donations > 0')
          .orWhereRaw('user_appreciation.num_appreciations > 0')
          .orWhereNotNull('user_follower.follow_at')
      })
      .orderByRaw('user_donation.num_donations DESC NULLS LAST')
      .orderByRaw('user_appreciation.num_appreciations DESC NULLS LAST')
      .orderByRaw('user_followee.is_followee DESC NULLS LAST')
      .orderByRaw('user_follower.follow_at DESC NULLS LAST')
      .limit(limit)
  }

  public loadNewFeatureArticles = async (
    tagId: string,
    limit: number
  ): Promise<RecommendedArticle[]> => {
    // Return empty array if tagId is not valid
    if (!tagId || tagId.trim() === '') {
      return []
    }

    return await this.knexRO('article_tag')
      .select('article.id', 'avn.title', 'u.display_name', 'article.short_hash')
      .join('article', 'article_tag.article_id', 'article.id')
      .join('article_version_newest as avn', 'article.id', 'avn.article_id')
      .join('user as u', 'article.author_id', 'u.id')
      .where('tag_id', tagId)
      .orderBy('article.created_at', 'desc')
      .limit(limit)
  }

  private loadDoneeHotArticles = async (
    userId: string,
    lastSeen: Date,
    limit: number,
    excludedArticleIds: string[]
  ): Promise<RecommendedArticle[]> => {
    const doneeIds = this.knexRO('transaction')
      .select('recipient_id')
      .where('purpose', 'donation')
      .where('sender_id', userId)
      .where('state', 'succeeded')

    return await this.loadArticles(
      userId,
      lastSeen,
      limit,
      doneeIds,
      excludedArticleIds
    )
  }

  private loadFolloweeHotArticles = async (
    userId: string,
    lastSeen: Date,
    limit: number,
    excludedArticleIds: string[]
  ): Promise<RecommendedArticle[]> => {
    const followeeIds = this.knexRO('action_user')
      .select('target_id')
      .where('user_id', userId)
      .where('action', 'follow')

    return await this.loadArticles(
      userId,
      lastSeen,
      limit,
      followeeIds,
      excludedArticleIds
    )
  }

  private loadArticles = async (
    userId: string,
    lastSeen: Date,
    limit: number,
    targetAuthorIds: Knex.QueryBuilder,
    excludedArticleIds: string[]
  ): Promise<RecommendedArticle[]> => {
    const query = this.knexRO('article')
      .select('article.id', 'avn.title', 'u.display_name', 'article.short_hash')
      .join('article_version_newest as avn', 'article.id', 'avn.article_id')
      .join('user as u', 'article.author_id', 'u.id')
      .where('article.created_at', '>=', lastSeen)
      .whereIn('article.author_id', targetAuthorIds)
      .whereNotIn(
        'article.id',
        this.knexRO('article_read_count')
          .select('article_id')
          .where('user_id', userId)
      )
      .leftOuterJoin(
        this.knexRO('transaction')
          .select('target_id', this.knexRO.raw('COUNT(id) as num_donations'))
          .where('created_at', '>=', lastSeen)
          .where('purpose', 'donation')
          .where('state', 'succeeded')
          .where('target_type', 4)
          .groupBy('target_id')
          .as('article_donation'),
        'article.id',
        'article_donation.target_id'
      )
      .leftOuterJoin(
        this.knexRO('appreciation')
          .select(
            'reference_id',
            this.knexRO.raw('SUM(amount) as num_appreciation')
          )
          .where('created_at', '>=', lastSeen)
          .where('purpose', 'appreciate')
          .groupBy('reference_id')
          .as('article_appreciation'),
        'article.id',
        'article_appreciation.reference_id'
      )
      .leftOuterJoin(
        this.knexRO('comment')
          .select(
            'target_id',
            this.knexRO.raw('COUNT(comment.id) as num_comments')
          )
          .join('article as a', 'comment.target_id', 'a.id')
          .where('a.created_at', '>=', lastSeen)
          .where('comment.created_at', '>=', lastSeen)
          .whereRaw('comment.author_id != a.author_id')
          .where('comment.type', 'article')
          .where('comment.state', 'active')
          .where('comment.target_type_id', 4)
          .groupBy('comment.target_id')
          .as('article_comment'),
        'article.id',
        'article_comment.target_id'
      )
      .where(function () {
        this.where('article_donation.num_donations', '>=', 1)
          .orWhere('article_appreciation.num_appreciation', '>=', 15)
          .orWhere('article_comment.num_comments', '>=', 2)
      })
      .orderByRaw('article_donation.num_donations DESC NULLS LAST')
      .orderByRaw('article_appreciation.num_appreciation DESC NULLS LAST')
      .orderByRaw('article_comment.num_comments DESC NULLS LAST')
      .limit(limit)

    if (excludedArticleIds.length > 0) {
      query.whereNotIn('article.id', excludedArticleIds)
    }

    return await query
  }

  private getSubject = (
    displayName: string,
    type: UserRetentionStateToMail,
    language: LANGUAGES
  ): string => {
    const subjects = {
      NEWUSER: {
        zh_hant:
          (displayName ? `${displayName}，剛來到` : '歡迎來到') +
          '馬特市，想與你分享 Matters 的小秘密',
        zh_hans:
          (displayName ? `${displayName}，刚來到` : '欢迎来到') +
          '马特市，想与你分享 Matters 的小秘密',
        en:
          (displayName ? `${displayName}，剛來到` : '歡迎來到') +
          '馬特市，想與你分享 Matters 的小秘密',
      },
      ACTIVE: {
        zh_hant: `${displayName}，在你離開 Matters 的期間， 我們為你整理了精彩內容`,
        zh_hans: `${displayName}，在你离开 Matters 的期间， 我们为你整理了精彩内容`,
        en: `${displayName}，在你離開 Matters 的期間， 我們為你整理了精彩內容`,
      },
    }
    const copys = subjects[type]
    return copys[language]
  }

  private getTemplateId = (language: LANGUAGES): string => {
    const templateIdsDev = {
      zh_hant: 'd-2eee98d3d8784567bd75e8a5dfd98ea2',
      zh_hans: 'd-3ffc4145b5784177a91a2a30ebad8a78',
      en: 'd-2eee98d3d8784567bd75e8a5dfd98ea2',
    }
    const templateIdsProd = {
      zh_hant: 'd-8152febbdbd843759cd29145dd80e523',
      zh_hans: 'd-439649cf75714fbf8003914eef1af4c4',
      en: 'd-8152febbdbd843759cd29145dd80e523',
    }
    const templateIds = isProd ? templateIdsProd : templateIdsDev
    return templateIds[language]
  }

  private getDays = (past: Date) => {
    const now = new Date()
    return Math.round(Math.abs((+now - +past) / DAY))
  }
}
