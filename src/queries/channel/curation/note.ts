import type { GQLCurationChannelResolvers } from '#definitions/index.js'

const resolver: GQLCurationChannelResolvers['note'] = async (
  { id, note },
  { input },
  { viewer, dataSources: { translationService } }
) => {
  const language = input?.language || viewer.language
  const translation = await translationService.findTranslation({
    table: 'curation_channel',
    field: 'note',
    id,
    language,
  })
  return translation ? translation.text : note || null
}

export default resolver
