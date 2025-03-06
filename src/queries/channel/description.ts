import type { GQLChannelResolvers } from 'definitions'

const resolver: GQLChannelResolvers['description'] = async (
  { id, description },
  { input },
  { viewer, dataSources: { translationService } }
) => {
  const language = input?.language || viewer.language
  const translation = await translationService.findTranslation({
    table: 'channel',
    field: 'description',
    id,
    language,
  })
  return translation ? translation.text : description || null
}

export default resolver
