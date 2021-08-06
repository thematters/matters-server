import {
  ActivityType,
  CIRCLE_ACTION,
  MATERIALIZED_VIEW,
  TAG_ACTION,
  USER_ACTION,
} from 'common/enums'
import { knex } from 'connectors'

const viewName = MATERIALIZED_VIEW.user_activity_materialized

export const withExcludedUsers = ({ userId }: { userId: string }) =>
  knex.with('excluded_users', (builder) => {
    // blocked users
    builder
      .select('target_id as user_id')
      .from('action_user')
      .where({ userId, action: USER_ACTION.block })
      // viewer
      .union(knex.raw(`select '${userId}' as user_id`))
  })

// retrieve base activities
export const makeBaseActivityQuery = ({ userId }: { userId: string }) =>
  withExcludedUsers({ userId })
    .select()
    .from(
      // retrieve UserPublishArticleActivity based on user's following user
      knex
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
        .union([
          // retrieve UserAddArticleTagActivity based on viewer's following tag
          knex
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
    )

// retrieve circle activities
export const makeCircleActivityQuery = ({ userId }: { userId: string }) =>
  withExcludedUsers({ userId })
    .select()
    .from(
      // retrieve UserCreateCircleActivity based on user's following user
      knex
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
          knex
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

// retrieve activities based on user's following user
export const makeUserFollowingActivityQuery = ({
  userId,
  type,
}: {
  userId: string
  type:
    | ActivityType.UserSubscribeCircleActivity
    | ActivityType.UserDonateArticleActivity
    | ActivityType.UserFollowUserActivity
}) =>
  withExcludedUsers({ userId })
    .select()
    .from(
      knex
        .as('selected_activities')
        .select('acty.*')
        .from('action_user as au')
        .join(`${viewName} as acty`, 'acty.actor_id', 'au.target_id')
        .leftJoin('excluded_users', 'acty.actor_id', 'excluded_users.user_id')
        .where({
          'excluded_users.user_id': null,
          'au.user_id': userId,
          'au.action': USER_ACTION.follow,
          'acty.type': type,
        })
    )
    .orderBy('created_at', 'desc')

// retrieve recommendations based on user read articles tags
export const makeReadArticlesTagsActivityQuery = ({
  userId,
}: {
  userId: string
}) =>
  withExcludedUsers({ userId })
    .select()
    .from(
      knex
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
