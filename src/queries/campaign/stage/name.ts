import type { GQLCampaignStageResolvers } from 'definitions'

const resolver: GQLCampaignStageResolvers['name'] = async (
  { id, name },
  { input },
  { viewer, dataSources: { translationService } }
) => {
  const language = input?.language || viewer.language
  const translation = await translationService.findTranslation({
    table: 'campaign_stage',
    field: 'name',
    id,
    language,
  })
  return translation ? translation.text : name
}

export default resolver
