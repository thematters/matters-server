import type { GQLAnnouncementResolvers } from '#definitions/index.js'

const resolver: GQLAnnouncementResolvers['link'] = async (
  { id, link },
  { input },
  { viewer, dataSources: { translationService } }
) => {
  const language = input?.language || viewer.language
  const translation = await translationService.findTranslation({
    table: 'announcement',
    field: 'link',
    id,
    language,
  })
  return translation ? translation.text : link ?? ''
}

export default resolver
