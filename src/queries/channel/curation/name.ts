import type { GQLCurationChannelResolvers } from '#definitions/index.js'

const resolver: GQLCurationChannelResolvers['name'] = async (
  { id, name },
  { input },
  { viewer, dataSources: { translationService } }
) => {
  const language = input?.language || viewer.language
  const translation = await translationService.findTranslation({
    table: 'curation_channel',
    field: 'name',
    id,
    language,
  })
  return translation ? translation.text : name
}

export default resolver
