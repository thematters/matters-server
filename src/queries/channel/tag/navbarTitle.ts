import type { GQLTagChannelResolvers } from '#definitions/index.js'

import { stripSpaces } from '#common/utils/text.js'

const resolver: GQLTagChannelResolvers['navbarTitle'] = async (
  { id, tagId, navbarTitle },
  { input },
  { viewer, dataSources: { atomService, translationService } }
) => {
  const language = input?.language || viewer.language

  const navbarTitleTranslation = await translationService.findTranslation({
    table: 'tag_channel',
    field: 'navbar_title',
    id,
    language,
  })

  if (
    navbarTitleTranslation?.text &&
    stripSpaces(navbarTitleTranslation.text)
  ) {
    return navbarTitleTranslation.text
  }

  if (navbarTitle && stripSpaces(navbarTitle)) {
    return navbarTitle
  }

  // fallback to tag content
  const tag = await atomService.tagIdLoader.load(tagId)
  return tag?.content ?? ''
}

export default resolver
