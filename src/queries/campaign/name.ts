import type { GQLWritingChallengeResolvers } from 'definitions'

const resolver: GQLWritingChallengeResolvers['name'] = async (
  { id, name },
  _,
  { viewer, dataSources: { translationService } }
) => {
  const translation = await translationService.findTranslation({
    table: 'campaign',
    field: 'name',
    id,
    language: viewer.language,
  })
  return translation ? translation.text : name
}

export default resolver
