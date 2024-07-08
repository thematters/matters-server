import type { GQLWritingChallengeResolvers } from 'definitions'

const resolver: GQLWritingChallengeResolvers['description'] = async (
  { id, description },
  _,
  { viewer, dataSources: { translationService } }
) => {
  const translation = await translationService.findTranslation({
    table: 'campaign',
    field: 'description',
    id,
    language: viewer.language,
  })
  return translation ? translation.text : description
}

export default resolver
