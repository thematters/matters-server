import type { GQLMutationResolvers } from 'definitions'

import {
  AuthenticationError,
  UserInputError,
  CampaignNotFoundError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['applyCampaign'] = async (
  _,
  { input: { id: globalId } },
  { viewer, dataSources: { campaignService, atomService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }
  const { type, id } = fromGlobalId(globalId)

  if (type !== 'Campaign') {
    throw new UserInputError('invalid campaign id')
  }

  const campaign = await atomService.findUnique({
    table: 'campaign',
    where: { id },
  })

  if (!campaign) {
    throw new CampaignNotFoundError('campaign not found')
  }

  await campaignService.apply(campaign, viewer)

  return campaign
}

export default resolver
