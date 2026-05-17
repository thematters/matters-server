import type { GQLMutationResolvers } from '#definitions/index.js'

import {
  NODE_TYPES,
  OFFICIAL_NOTICE_EXTEND_TYPE,
  USER_FEATURE_FLAG_TYPE,
} from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'

const communityWatchRulesLink = () => {
  const baseUrl =
    process.env.COMMUNITY_WATCH_URL ?? 'https://community-watch.matters.town'
  return `${baseUrl.replace(/\/$/, '')}/rules/`
}

const resolver: GQLMutationResolvers['putUserFeatureFlags'] = async (
  _,
  { input: { ids, flags } },
  {
    dataSources: {
      userService,
      atomService,
      notificationService,
      connections: { redis },
    },
  }
) => {
  if (ids.length === 0) {
    throw new UserInputError('"ids" is required')
  }

  const userIds = ids.map((id) => fromGlobalId(id).id)

  for (const userId of userIds) {
    const previousFlags = await userService.findFeatureFlags(userId)
    const hadCommunityWatch = previousFlags.some(
      ({ type }) => type === USER_FEATURE_FLAG_TYPE.communityWatch
    )
    const hasCommunityWatch = flags.includes(
      USER_FEATURE_FLAG_TYPE.communityWatch
    )

    await userService.updateFeatureFlags(userId, flags)
    invalidateFQC({ node: { id: userId, type: NODE_TYPES.User }, redis })

    if (hadCommunityWatch !== hasCommunityWatch) {
      await notificationService.trigger({
        event: hasCommunityWatch
          ? OFFICIAL_NOTICE_EXTEND_TYPE.community_watch_enabled
          : OFFICIAL_NOTICE_EXTEND_TYPE.community_watch_disabled,
        recipientId: userId,
        data: { link: communityWatchRulesLink() },
      })
    }
  }

  return atomService.userIdLoader.loadMany(userIds)
}

export default resolver
