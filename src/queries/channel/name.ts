import type { GQLChannelResolvers } from 'definitions/index.js'

const resolver: GQLChannelResolvers['name'] = async (
  { id, name },
  { input },
  { viewer, dataSources: { translationService } }
) => {
  const language = input?.language || viewer.language
  const translation = await translationService.findTranslation({
    table: 'channel',
    field: 'name',
    id,
    language,
  })
  return translation ? translation.text : name
}

export default resolver
