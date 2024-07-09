import type { GQLDraftResolvers } from 'definitions'

const resolver: GQLDraftResolvers['campaigns'] = (
  { campaigns },
  _,
  { dataSources: { atomService } }
) => {
  if (!campaigns) {
    return []
  }
  return Promise.all(
    campaigns.map(
      async ({ campaign, stage }: { campaign: string; stage: string }) => ({
        campaign: await atomService.campaignIdLoader.load(campaign),
        stage: await atomService.campaignStageIdLoader.load(stage),
      })
    )
  )
}

export default resolver
