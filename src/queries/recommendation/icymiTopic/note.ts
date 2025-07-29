import type { GQLIcymiTopicResolvers } from '#definitions/index.js'

export const note: GQLIcymiTopicResolvers['note'] = async (
  { id, note: _note },
  { input },
  { viewer, dataSources: { translationService } }
) => {
  const language = input?.language || viewer.language
  const translation = await translationService.findTranslation({
    table: 'matters_choice_topic',
    field: 'note',
    id,
    language,
  })
  return translation ? translation.text : _note || null
}
