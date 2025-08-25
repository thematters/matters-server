import type { GQLTagResolvers } from '#definitions/index.js'

const resolver: GQLTagResolvers['navbarTitle'] = async (
  { id, content },
  { input },
  { viewer, dataSources: { atomService, translationService } }
) => {
  const language = input?.language || viewer.language

  const tagChannel = await atomService.findFirst({
    table: 'tag_channel',
    where: { tagId: id },
  })

  const navbarTitleTranslation = tagChannel
    ? await translationService.findTranslation({
        table: 'tag_channel',
        field: 'navbar_title',
        id: tagChannel.id,
        language,
      })
    : null

  if (navbarTitleTranslation) {
    return navbarTitleTranslation.text
  }

  if (tagChannel?.navbarTitle) {
    return tagChannel.navbarTitle
  }

  // Fallback to tag content
  return content
}

export default resolver
