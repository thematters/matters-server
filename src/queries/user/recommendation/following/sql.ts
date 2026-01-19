import type { Knex } from 'knex'

import {
  ActivityType,
  CIRCLE_ACTION,
  CIRCLE_STATE,
  MATERIALIZED_VIEW,
  TAG_ACTION,
  USER_ACTION,
  NODE_TYPES,
  MOMENT_STATE,
} from '#common/enums/index.js'
import { selectWithTotalCount } from '#common/utils/index.js'

const viewName = MATERIALIZED_VIEW.user_activity_materialized

export interface Activity {
  type: ActivityType
  actorId: string
  nodeId: string
  nodeType: NODE_TYPES
  targetId: string | null
  targetType: string | null
  actyNode2: string | null
  actyNode3: string | null
  actyNode4: string | null
  createdAt: Date
}

export const withExcludedUsers = (
  { userId }: { userId: string },
  knexRO: Knex
) =>
  knexRO.with('excluded_users', (builder) => {
    // blocked users
    builder
      .select('target_id as user_id')
      .from('action_user')
      .where({ userId, action: USER_ACTION.block })
      // viewer
      .union(knexRO.raw('select ? as user_id', [userId]))
  })

// retrieve base activities
export const makeBaseActivityQuery = async (
  { userId }: { userId: string },
  { skip, take }: { skip: number; take: number },
  articleOnly = false,
  knexRO: Knex
): Promise<[Activity[], number]> => {
  const baseQuery = withExcludedUsers({ userId }, knexRO)
    .select()
    .from(
      // retrieve UserPublishArticleActivity based on user's following user
      knexRO
        .as('selected_activities')
        .select('acty.*')
        .from('action_user as au')
        .join(`${viewName} as acty`, 'acty.actor_id', 'au.target_id')
        .leftJoin('excluded_users', 'acty.actor_id', 'excluded_users.user_id')
        .where({
          'excluded_users.user_id': null,
          'au.user_id': userId,
          'au.action': USER_ACTION.follow,
          'acty.type': ActivityType.UserPublishArticleActivity,
        })
        .modify((builder: Knex.QueryBuilder) => {
          if (articleOnly !== true) {
            builder.union([
              // retrieve UserAddArticleTagActivity based on viewer's following tag
              knexRO
                .select('acty.*')
                .from('action_tag as at')
                .join(`${viewName} as acty`, 'acty.target_id', 'at.target_id')
                .leftJoin(
                  'excluded_users',
                  'acty.actor_id',
                  'excluded_users.user_id'
                )
                .where({
                  'excluded_users.user_id': null,
                  'at.user_id': userId,
                  'at.action': TAG_ACTION.follow,
                  'acty.type': ActivityType.UserAddArticleTagActivity,
                }),
              // retrieve UserPostMomentActivity based on user's following user
              knexRO
                .select('acty.*')
                .from('action_user as au')
                .join(`${viewName} as acty`, 'acty.actor_id', 'au.target_id')
                .leftJoin(
                  'excluded_users',
                  'acty.actor_id',
                  'excluded_users.user_id'
                )
                .join('moment', 'acty.node_id', 'moment.id')
                .where({
                  'moment.state': MOMENT_STATE.active,
                  'excluded_users.user_id': null,
                  'au.user_id': userId,
                  'au.action': USER_ACTION.follow,
                  'acty.type': ActivityType.UserPostMomentActivity,
                }),
            ])
          }
        })
    )

  if (articleOnly !== true) {
    const momentCollapseThreshold = 2
    // First group records with same activity type (what lagged, diffed, type_grouped CTE is for),
    // then subgroup records according time window (4 hours as a group, and start from first record in outer group)
    const query = knexRO
      .with('base', baseQuery)
      .with(
        'lagged',
        knexRO.raw(
          'SELECT *, lag(type) OVER (PARTITION BY actor_id ORDER BY created_at) AS prev_type FROM base ORDER BY created_at'
        )
      )
      .with(
        'diffed',
        knexRO.raw(
          'SELECT *, CASE WHEN type = prev_type THEN 0 ELSE 1 END AS change_flag FROM lagged'
        )
      )
      .with(
        'type_grouped',
        knexRO.raw(
          'SELECT *, SUM(change_flag) OVER (PARTITION BY actor_id ORDER BY created_at) AS type_group FROM diffed'
        )
      )
      .with(
        'time_grouped',
        knexRO.raw(
          'SELECT *, ((extract(epoch FROM created_at - first_value(created_at) OVER (PARTITION BY actor_id, type_group ORDER BY created_at))/3600)::integer)/4 AS time_group FROM type_grouped'
        )
      )
      .with(
        'agged',
        knexRO.raw(
          `SELECT
              *,
              row_number() OVER acty_group AS rank,
              count(1) OVER (PARTITION BY actor_id, type_group, time_group ) ::integer AS group_size,
              nth_value(node_id, 2) OVER acty_group AS acty_node_2,
              nth_value(node_id, 3) OVER acty_group AS acty_node_3,
              nth_value(node_id, 4) OVER acty_group AS acty_node_4
          FROM time_grouped
          WINDOW acty_group AS (PARTITION BY actor_id, type_group, time_group ORDER BY created_at DESC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)`
        )
      )
      .select('*')
      .modify(selectWithTotalCount)
      .from('agged')
      .where((whereBuilder) => {
        whereBuilder
          .where('type', '=', ActivityType.UserPostMomentActivity)
          .andWhere('group_size', '<=', momentCollapseThreshold)
      })
      .orWhere((orWhereBuilder) => {
        orWhereBuilder
          .where('type', '=', ActivityType.UserPostMomentActivity)
          .andWhere('group_size', '>', momentCollapseThreshold)
          .andWhere('rank', '=', 1)
      })
      .orWhere('type', '!=', ActivityType.UserPostMomentActivity)
      .orderBy('created_at', 'desc')
      .offset(skip)
      .limit(take)

    const records = await query

    return [
      records.map((record: Activity & { groupSize: number }) => ({
        ...record,
        actyNode2:
          record.groupSize <= momentCollapseThreshold ? null : record.actyNode2,
        actyNode3:
          record.groupSize <= momentCollapseThreshold ? null : record.actyNode3,
        actyNode4:
          record.groupSize <= momentCollapseThreshold ? null : record.actyNode4,
      })),
      records[0]?.totalCount ?? 0,
    ]
  } else {
    const records = await knexRO
      .select('*')
      .modify(selectWithTotalCount)
      .from(baseQuery.as('base'))
      .orderBy('created_at', 'desc')
      .offset(skip)
      .limit(take)
    return [records, records[0]?.totalCount ?? 0]
  }
}

// retrieve circle activities
export const makeCircleActivityQuery = (
  { userId }: { userId: string },
  knexRO: Knex
) =>
  withExcludedUsers({ userId }, knexRO)
    .select()
    .from(
      // retrieve UserCreateCircleActivity based on user's following user
      knexRO
        .as('selected_activities')
        .select('acty.*')
        .from('action_user as au')
        .join(`${viewName} as acty`, 'acty.actor_id', 'au.target_id')
        .leftJoin('excluded_users', 'acty.actor_id', 'excluded_users.user_id')
        .where({
          'excluded_users.user_id': null,
          'au.user_id': userId,
          'au.action': USER_ACTION.follow,
          'acty.type': ActivityType.UserCreateCircleActivity,
        })
        .union([
          // retrieve UserBroadcastCircleActivity based on viewer's following circle
          knexRO
            .select('acty.*')
            .from('action_circle as ac')
            .join(`${viewName} as acty`, 'acty.target_id', 'ac.target_id')
            .leftJoin(
              'excluded_users',
              'acty.actor_id',
              'excluded_users.user_id'
            )
            .where({
              'excluded_users.user_id': null,
              'ac.user_id': userId,
              'ac.action': CIRCLE_ACTION.follow,
              'acty.type': ActivityType.UserBroadcastCircleActivity,
            }),
        ])
    )

// retrieve UserDonateArticleActivity
export const makeUserDonateArticleActivityQuery = (
  {
    userId,
  }: {
    userId: string
  },
  knexRO: Knex
) => {
  const query = (builder: Knex.QueryBuilder) =>
    builder
      .select()
      .from(subquery)
      .where({ rowNumber: 1 })
      .as('selected_activities')

  const subquery = (builder: Knex.QueryBuilder) =>
    builder
      .as('activities')
      .select('acty.*')
      .select(
        knexRO.raw(
          'row_number() over (partition by node_id order by acty.id desc) as row_number'
        )
      )
      .from('action_user as au')
      .join(`${viewName} as acty`, 'acty.actor_id', 'au.target_id')
      .leftJoin('excluded_users', 'acty.actor_id', 'excluded_users.user_id')
      .where({
        'excluded_users.user_id': null,
        'au.user_id': userId,
        'au.action': USER_ACTION.follow,
        'acty.type': ActivityType.UserDonateArticleActivity,
      })

  return withExcludedUsers({ userId }, knexRO)
    .select()
    .from(query)
    .orderBy('created_at', 'desc')
}

// retrieve UserFollowUserActivity
export const makeUserFollowUserActivityQuery = (
  {
    userId,
  }: {
    userId: string
  },
  knexRO: Knex
) => {
  // get followee count of followers` followers
  const followeeCountOfFollowerFollower = knexRO
    .select('acty.node_id', knexRO.raw('COUNT(*) as followee_count'))
    .from('action_user AS au')
    .join(`${viewName} AS acty`, 'acty.actor_id', 'au.target_id')
    .join(`user`, 'acty.node_id', 'user.id')
    .leftJoin('excluded_users', 'acty.node_id', 'excluded_users.user_id')
    .leftJoin(
      'excluded_followers',
      'acty.node_id',
      'excluded_followers.user_id'
    )
    .leftJoin('user_restriction', 'acty.node_id', 'user_restriction.user_id')
    .where({
      'user.state': 'active',
      'excluded_users.user_id': null,
      'excluded_followers.user_id': null,
      'user_restriction.user_id': null,
      'au.user_id': userId,
      'au.action': USER_ACTION.follow,
      'acty.type': ActivityType.UserFollowUserActivity,
    })
    .groupBy('acty.node_id')

  // get followee count of all users
  const followeeCountOfAll = knexRO
    .select('target_id', knexRO.raw('COUNT(*) AS followee_count'))
    .from('action_user')
    .where({ action: USER_ACTION.follow })
    .groupBy('target_id')

  return withExcludedUsers({ userId }, knexRO)
    .with('excluded_followers', (builder) => {
      builder
        .select('target_id as user_id')
        .from('action_user')
        .where({ userId, action: USER_ACTION.follow })
    })
    .select('t1.node_id')
    .from(followeeCountOfFollowerFollower.as('t1'))
    .join(followeeCountOfAll.as('t2'), 't1.node_id', 't2.target_id')
    .orderBy([
      { column: 't1.followee_count', order: 'desc' },
      { column: 't2.followee_count', order: 'desc' },
    ])
}

// retrieve UserSubscribeCircleActivity
export const makeUserSubscribeCircleActivityQuery = (
  {
    userId,
  }: {
    userId: string
  },
  knexRO: Knex
) => {
  const query = (builder: Knex.QueryBuilder) =>
    builder
      .select()
      .from(subquery)
      .where({ rowNumber: 1 })
      .as('selected_activities')

  const subquery = (builder: Knex.QueryBuilder) =>
    builder
      .as('activities')
      .select('acty.*')
      .select(
        knexRO.raw(
          'row_number() over (partition by node_id order by acty.id desc) as row_number'
        )
      )
      .from('action_user as au')
      .join(`${viewName} as acty`, 'acty.actor_id', 'au.target_id')
      .leftJoin('excluded_users', 'acty.actor_id', 'excluded_users.user_id')
      .leftJoin(
        'excluded_circles',
        'acty.node_id',
        'excluded_circles.circle_id'
      )
      .where({
        'excluded_users.user_id': null,
        'excluded_circles.circle_id': null,
        'au.user_id': userId,
        'au.action': USER_ACTION.follow,
        'acty.type': ActivityType.UserSubscribeCircleActivity,
      })

  return withExcludedUsers({ userId }, knexRO)
    .with('excluded_circles', (builder) => {
      // following circles
      builder
        .select('target_id as circle_id')
        .from('action_circle')
        .where({ userId, action: CIRCLE_ACTION.follow })
        // viewer own circles
        .union(
          knexRO
            .select('id as circle_id')
            .from('circle')
            .where({ owner: userId, state: CIRCLE_STATE.active })
        )
      // TODO: subscirbed circles,
      // skip for now since subscribed circle also the following circle
      // and querying subscribed circles are expensive
      // @see `queries/user/subscribedCircles.ts`
    })
    .select()
    .from(query)
    .orderBy('created_at', 'desc')
}

/**
 * Retrieve article recommendations based on user's read articles tags.
 *
 * This query directly uses the following materialized views:
 *
 * 1. `article_read_time_materialized`
 *    - Aggregates total read time per article from all users
 *    - Used to rank articles within tags by popularity
 *
 * 2. `recently_read_tags_materialized`
 *    - Calculates personalized tag scores for each user based on recent reading history
 *    - Score = local_appearance / global_appearance (tags frequent in user's reads but rare globally score higher)
 *    - Limited to top 10 tags per user, tags must have >= 5 global appearances
 *
 * The query combines these views to generate article recommendations:
 * - Finds articles sharing tags with user's read articles, ranked by (tag_score * sum_read_time)
 * - Excludes articles the user has already read and user's own articles
 * - Additionally filters out articles from blocked users.
 *
 * Data flow:
 * ```
 * article_read_count (user reads article)
 *         │
 *         ├──────────────────────────┐
 *         ▼                          ▼
 * recently_read_tags_materialized    article_read_time_materialized
 * (user's tag preferences)           (article popularity)
 *         │                          │
 *         └──────────┬───────────────┘
 *                    ▼
 *         (computed at query time)
 * (personalized article recommendations)
 * ```
 */
export const makeReadArticlesTagsActivityQuery = (
  {
    userId,
  }: {
    userId: string
  },
  knexRO: Knex
) => {
  // below complex SQL derive from db/migrations/20210809084245_alter_recommended_articles_from_read_tags.js
  const TAG_ARTICLE_LIMIT = 20
  // CTE: Get top articles per tag ranked by read time
  const tagArticleReadTime = knexRO
    .select('*')
    .from(
      knexRO
        .select(
          'article_tag.tag_id',
          'art.article_id',
          'art.sum_read_time',
          knexRO.raw(
            'ROW_NUMBER() OVER (PARTITION BY article_tag.tag_id ORDER BY art.sum_read_time DESC) AS row_num'
          )
        )
        .from('article_tag')
        .join(
          'article_read_time_materialized as art',
          'article_tag.article_id',
          'art.article_id'
        )
        .leftJoin('article', 'article.id', 'art.article_id')
        .leftJoin('user', 'user.id', 'article.author_id')
        .where('article.state', 'active')
        .andWhere('user.state', 'active')
        .as('t')
    )
    .where('row_num', '<=', TAG_ARTICLE_LIMIT)

  // CTE: Compute recommended articles with scores
  const recommendedArticles = knexRO
    .select(
      'rrt.user_id',
      'tart.article_id',
      knexRO.raw(
        'array_agg(tart.tag_id ORDER BY rrt.tag_score DESC) AS tags_based'
      ),
      knexRO.raw('sum(rrt.tag_score * tart.sum_read_time) AS score')
    )
    .from('recently_read_tags_materialized as rrt')
    .leftJoin(tagArticleReadTime.as('tart'), 'rrt.tag_id', 'tart.tag_id')
    .where('rrt.user_id', userId)
    .whereNotNull('tart.article_id')
    .groupBy('rrt.user_id', 'tart.article_id')

  return withExcludedUsers({ userId }, knexRO)
    .select()
    .from(
      knexRO
        .as('selected_recommendations')
        .select(
          knexRO.raw(
            'row_number() over (order by recommended.user_id, recommended.article_id) AS id'
          ),
          'recommended.user_id',
          'recommended.article_id',
          'recommended.tags_based',
          'recommended.score'
        )
        .from(recommendedArticles.as('recommended'))
        // Exclude articles user has already read
        .leftJoin('article_read_count as arc', function () {
          this.on('arc.article_id', '=', 'recommended.article_id').andOn(
            'arc.user_id',
            '=',
            'recommended.user_id'
          )
        })
        // Exclude user's own articles
        .leftJoin('article as own_article', function () {
          this.on('own_article.id', '=', 'recommended.article_id').andOn(
            'own_article.author_id',
            '=',
            'recommended.user_id'
          )
        })
        // Exclude blocked users' articles
        .leftJoin('article', 'recommended.article_id', 'article.id')
        .leftJoin(
          'excluded_users',
          'article.author_id',
          'excluded_users.user_id'
        )
        .whereNull('arc.article_id')
        .whereNull('own_article.author_id')
        .whereNull('excluded_users.user_id')
        .orderBy('score', 'desc')
    )
}
