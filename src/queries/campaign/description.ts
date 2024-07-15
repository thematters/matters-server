import type { GQLWritingChallengeResolvers } from 'definitions'

const resolver: GQLWritingChallengeResolvers['description'] = async (
  { id, description },
  { input },
  { viewer, dataSources: { translationService } }
) => {
  const language = input?.language || viewer.language
  const translation = await translationService.findTranslation({
    table: 'campaign',
    field: 'description',
    id,
    language,
  })
  return translation ? translation.text : description
}

export default resolver
