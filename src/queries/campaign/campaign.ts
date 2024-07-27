import type { GQLQueryResolvers } from 'definitions'

import { CAMPAIGN_STATE } from 'common/enums'

const resolver: GQLQueryResolvers['campaign'] = async (
  _,
  { input: { shortHash } },
  { viewer, dataSources: { atomService } }
) => {
  const campaign = await atomService.findUnique({
    table: 'campaign',
    where: { shortHash },
  })

  const isAdmin = viewer.hasRole('admin')
  if (
    !isAdmin &&
    [
      CAMPAIGN_STATE.pending as string,
      CAMPAIGN_STATE.archived as string,
    ].includes(campaign.state)
  ) {
    return null
  }
  return campaign
}

export default resolver
