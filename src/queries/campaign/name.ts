import type { GQLWritingChallengeResolvers } from 'definitions'

const resolver: GQLWritingChallengeResolvers['name'] = async (
  { id, name },
  { input },
  { viewer, dataSources: { translationService } }
) => {
  const language = input?.language || viewer.language
  const translation = await translationService.findTranslation({
    table: 'campaign',
    field: 'name',
    id,
    language,
  })
  return translation ? translation.text : name
}

export default resolver
