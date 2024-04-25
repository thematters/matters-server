import type { GQLUserStatusResolvers } from 'definitions'

import { ActivityType, LOG_RECORD_TYPES, MATERIALIZED_VIEW } from 'common/enums'

const resolver: GQLUserStatusResolvers['unreadFollowing'] = async (
  { id: userId },
  _,
  {
    dataSources: {
      systemService,
      connections: { knexRO },
    },
  }
) => {
  if (userId === null) {
    return false
  }
  const readFollowingFeedLog = await systemService.findLogRecord({
    userId,
    type: LOG_RECORD_TYPES.ReadFollowingFeed,
  })

  const latestActivity = await knexRO
    .select()
    .from(
      // filter activies based on user's following user
      knexRO
        .as('selected_activities')
        .select('acty.*')
        .from('action_user as au')
        .join(
          `${MATERIALIZED_VIEW.user_activity_materialized} as acty`,
          'acty.actor_id',
          'au.target_id'
        )
        .where({
          'au.user_id': userId,
          'au.action': 'follow',
          'acty.type': ActivityType.UserPublishArticleActivity,
        })
        .union([
          // filter activities based on viewer's following tag
          knexRO
            .select('acty.*')
            .from('action_tag as at')
            .join(
              `${MATERIALIZED_VIEW.user_activity_materialized} as acty`,
              'acty.target_id',
              'at.target_id'
            )
            .where({
              'at.user_id': userId,
              'at.action': 'follow',
              'acty.type': ActivityType.UserAddArticleTagActivity,
            }),
          // filter activities based on viewer's following circle
          knexRO
            .select('acty.*')
            .from('action_circle as ac')
            .join(
              `${MATERIALIZED_VIEW.user_activity_materialized} as acty`,
              'acty.target_id',
              'ac.target_id'
            )
            .where({
              'ac.user_id': userId,
              'ac.action': 'follow',
              'acty.type': ActivityType.UserBroadcastCircleActivity,
            }),
        ])
    )
    .orderBy('created_at', 'desc')
    .first()

  if (!latestActivity) {
    return false
  }

  if (!readFollowingFeedLog) {
    return true
  }

  return readFollowingFeedLog.readAt < latestActivity.createdAt
}

export default resolver
