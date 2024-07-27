import type { GQLMutationResolvers } from 'definitions'

import { invalidateFQC } from '@matters/apollo-response-cache'

import { NODE_TYPES, CAMPAIGN_USER_STATE } from 'common/enums'
import {
  AuthenticationError,
  UserInputError,
  CampaignNotFoundError,
  UserNotFoundError,
  ActionFailedError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['updateCampaignApplicationState'] = async (
  _,
  { input: { campaign: campaignGlobalId, user: userGlobalId, state } },
  {
    viewer,
    dataSources: {
      atomService,
      campaignService,
      connections: { redis },
    },
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }
  const { type: campaignType, id: campaignId } = fromGlobalId(campaignGlobalId)
  const { type: userType, id: userId } = fromGlobalId(userGlobalId)

  if (campaignType !== 'Campaign' || !campaignId) {
    throw new UserInputError('invalid campaign id')
  }

  if (userType !== 'User' || !userId) {
    throw new UserInputError('invalid user id')
  }

  const campaign = await atomService.findUnique({
    table: 'campaign',
    where: { id: campaignId },
  })

  if (!campaign) {
    throw new CampaignNotFoundError('campaign not found')
  }

  const user = await atomService.findUnique({
    table: 'user',
    where: { id: userId },
  })

  if (!user) {
    throw new UserNotFoundError('user not found')
  }

  const campaignUser = await atomService.findFirst({
    table: 'campaign_user',
    where: { campaignId: campaignId, userId: userId },
  })

  if (!campaignUser) {
    throw new ActionFailedError('user has not applied to this campaign')
  }

  if (state === CAMPAIGN_USER_STATE.succeeded) {
    await campaignService.approve(campaignUser.id)
  } else {
    await atomService.update({
      table: 'campaign_user',
      where: { id: campaignUser.id },
      data: { state },
    })
  }

  invalidateFQC({
    node: { type: NODE_TYPES.User, id: userId },
    redis: redis,
  })

  return campaign
}

export default resolver
