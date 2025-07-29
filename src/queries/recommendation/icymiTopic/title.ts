import type { GQLIcymiTopicResolvers } from '#definitions/index.js'

export const title: GQLIcymiTopicResolvers['title'] = async (
  { id, title: _title },
  { input },
  { viewer, dataSources: { translationService } }
) => {
  const language = input?.language || viewer.language
  const translation = await translationService.findTranslation({
    table: 'matters_choice_topic',
    field: 'title',
    id,
    language,
  })
  return translation ? translation.text : _title || ''
}
