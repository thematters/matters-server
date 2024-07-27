import { Knex } from 'knex'

import {
  ActivityType,
  CIRCLE_ACTION,
  CIRCLE_STATE,
  MATERIALIZED_VIEW,
  TAG_ACTION,
  USER_ACTION,
  NODE_TYPES,
} from 'common/enums'

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
      .union(knexRO.raw(`select '${userId}' as user_id`))
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
                .where({
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
    // First group records with same activity type (what lagged, diffed, type_grouped CTE is for),
    // then subgroup records according time window (4 hours as a group, and start from first record in outer group)
    const records = await knexRO
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
          'SELECT *, (extract(hour FROM created_at - first_value(created_at) OVER (PARTITION BY actor_id, type_group ORDER BY created_at))::integer)/4 AS time_group FROM type_grouped'
        )
      )
      .with(
        'agged',
        knexRO.raw(
          `SELECT
              *,
              row_number() OVER acty_group AS rank,
              count(1) OVER (PARTITION BY actor_id, type_group, time_group ) AS group_size,
              nth_value(node_id, 2) OVER acty_group AS acty_node_2,
              nth_value(node_id, 3) OVER acty_group AS acty_node_3,
              nth_value(node_id, 4) OVER acty_group AS acty_node_4
          FROM time_grouped
          WINDOW acty_group AS (PARTITION BY actor_id, type_group, time_group ORDER BY created_at DESC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)`
        )
      )
      .select('*', knexRO.raw('count(1) OVER() AS total_count'))
      .from('agged')
      .where((whereBuilder) => {
        whereBuilder
          .where('type', '=', ActivityType.UserPostMomentActivity)
          .andWhere('group_size', '<=', 2)
      })
      .orWhere((orWhereBuilder) => {
        orWhereBuilder
          .where('type', '=', ActivityType.UserPostMomentActivity)
          .andWhere('group_size', '>', 2)
          .andWhere('rank', '=', 1)
      })
      .orWhere('type', '!=', ActivityType.UserPostMomentActivity)
      .orderBy('created_at', 'desc')
      .offset(skip)
      .limit(take)
    return [records, +(records[0]?.totalCount ?? 0)]
  } else {
    const records = await knexRO
      .select('*', knexRO.raw('count(1) OVER() AS total_count'))
      .from(baseQuery.as('base'))
      .orderBy('created_at', 'desc')
      .offset(skip)
      .limit(take)
    return [records, +(records[0]?.totalCount ?? 0)]
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
        'excluded_followers',
        'acty.node_id',
        'excluded_followers.user_id'
      )
      .where({
        'excluded_users.user_id': null,
        'excluded_followers.user_id': null,
        'au.user_id': userId,
        'au.action': USER_ACTION.follow,
        'acty.type': ActivityType.UserFollowUserActivity,
      })

  return withExcludedUsers({ userId }, knexRO)
    .with('excluded_followers', (builder) => {
      builder
        .select('target_id as user_id')
        .from('action_user')
        .where({ userId, action: USER_ACTION.follow })
    })
    .select()
    .from(query)
    .orderBy('created_at', 'desc')
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

// retrieve recommendations based on user read articles tags
export const makeReadArticlesTagsActivityQuery = (
  {
    userId,
  }: {
    userId: string
  },
  knexRO: Knex
) =>
  withExcludedUsers({ userId }, knexRO)
    .select()
    .from(
      knexRO
        .as('selected_recommendations')
        .select('recommended.*')
        .from('recommended_articles_from_read_tags_materialized as recommended')
        .leftJoin('article', 'recommended.article_id', 'article.id')
        .leftJoin(
          'excluded_users',
          'article.author_id',
          'excluded_users.user_id'
        )
        .where({
          'excluded_users.user_id': null,
          'recommended.user_id': userId,
        })
    )
