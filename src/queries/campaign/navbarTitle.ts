import type { GQLWritingChallengeResolvers } from '#definitions/index.js'

const resolver: GQLWritingChallengeResolvers['navbarTitle'] = async (
  { id, name },
  { input },
  { viewer, dataSources: { atomService, translationService } }
) => {
  const language = input?.language || viewer.language
  const campaignChannel = await atomService.findFirst({
    table: 'campaign_channel',
    where: { campaignId: id },
  })
  const navbarTitleTranslation = campaignChannel
    ? await translationService.findTranslation({
        table: 'campaign_channel',
        field: 'navbar_title',
        id: campaignChannel?.id,
        language,
      })
    : null
  if (navbarTitleTranslation) {
    return navbarTitleTranslation.text
  }
  if (campaignChannel?.navbarTitle) {
    return campaignChannel.navbarTitle
  }
  const nameTranslation = await translationService.findTranslation({
    table: 'campaign',
    field: 'name',
    id,
    language,
  })
  return nameTranslation?.text ?? name
}

export default resolver
