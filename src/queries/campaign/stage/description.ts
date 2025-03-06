import type { GQLCampaignStageResolvers } from '#definitions/index.js'

const resolver: GQLCampaignStageResolvers['description'] = async (
  { id, description },
  { input },
  { viewer, dataSources: { translationService } }
) => {
  const language = input?.language || viewer.language
  const translation = await translationService.findTranslation({
    table: 'campaign_stage',
    field: 'description',
    id,
    language,
  })
  return translation ? translation.text : description
}

export default resolver
