import type { GQLAnnouncementResolvers } from '#definitions/index.js'

const resolver: GQLAnnouncementResolvers['title'] = async (
  { id, title },
  { input },
  { viewer, dataSources: { translationService } }
) => {
  const language = input?.language || viewer.language
  const translation = await translationService.findTranslation({
    table: 'announcement',
    field: 'title',
    id,
    language,
  })
  return translation ? translation.text : title ?? ''
}

export default resolver
