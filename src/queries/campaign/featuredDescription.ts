import type { GQLWritingChallengeResolvers } from '#definitions/index.js'

const resolver: GQLWritingChallengeResolvers['featuredDescription'] = async (
  { id, featuredDescription },
  { input },
  { viewer, dataSources: { translationService } }
) => {
  const language = input?.language || viewer.language
  const translation = await translationService.findTranslation({
    table: 'campaign',
    field: 'featured_description',
    id,
    language,
  })
  return translation ? translation.text : featuredDescription
}

export default resolver
