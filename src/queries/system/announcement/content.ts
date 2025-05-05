import type { GQLAnnouncementResolvers } from '#definitions/index.js'

const resolver: GQLAnnouncementResolvers['content'] = async (
  { id, content },
  { input },
  { viewer, dataSources: { translationService } }
) => {
  const language = input?.language || viewer.language
  const translation = await translationService.findTranslation({
    table: 'announcement',
    field: 'content',
    id,
    language,
  })
  return translation ? translation.text : content ?? ''
}

export default resolver
