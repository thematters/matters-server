import { Knex } from 'knex'

import {
  ActivityType,
  CIRCLE_ACTION,
  CIRCLE_STATE,
  MATERIALIZED_VIEW,
  TAG_ACTION,
  USER_ACTION,
} from 'common/enums'

const viewName = MATERIALIZED_VIEW.user_activity_materialized

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
): Promise<[any, number]> => {
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
            ])
          }
        })
    )

  if (articleOnly !== true) {
    const records = await knexRO
      .with('base', baseQuery)
      .with(
        'lagged',
        knexRO.raw(
          'SELECT *, lag(type, actor_id) OVER (ORDER BY created_at) AS prev_type FROM base ORDER BY created_at'
        )
      )
      .with(
        'diffed',
        knexRO.raw(
          'SELECT *, CASE WHEN (type, actor_id) = prev_type THEN 0 ELSE 1 END AS change_flag FROM lagged'
        )
      )
      .with(
        'type_grouped',
        knexRO.raw(
          'SELECT *, SUM(change_flag) OVER (ORDER BY created_at) AS type_group FROM diffed'
        )
      )
      .with(
        'time_grouped',
        knexRO.raw(
          'SELECT *, (extract(minute FROM created_at - first_value(created_at) OVER (PARTITION BY type_group ORDER BY created_at))::integer)/2 AS time_group FROM type_grouped'
        )
      )
      .with(
        'agged',
        knexRO.raw(
          'SELECT *, row_number() OVER act_group AS rn, count(1) OVER (PARTITION BY type_group, time_group ) AS group_size, nth_value(id, 2) OVER act_group as act_2,  nth_value(id, 3) OVER act_group AS act_3 FROM time_grouped WINDOW act_group AS (PARTITION BY type_group, time_group ORDER BY created_at DESC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)'
        )
      )
      .select('*', knexRO.raw('count(1) OVER() AS total_count'))
      .orderBy('created_at', 'desc')
      .offset(skip)
      .limit(take)
    return [records, +(records[0]?.totalCount ?? 0)]
  } else {
    const records = await knexRO
      .select('*', knexRO.raw('count(1) OVER() AS total_count'))
      .from(baseQuery)
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
