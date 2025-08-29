import type { GQLTopicChannelResolvers } from '#definitions/index.js'

import { stripSpaces } from '#common/utils/text.js'

const resolver: GQLTopicChannelResolvers['navbarTitle'] = async (
  { id, name, navbarTitle },
  { input },
  { viewer, dataSources: { translationService } }
) => {
  const language = input?.language || viewer.language
  const navbarTitleTranslation = await translationService.findTranslation({
    table: 'topic_channel',
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
  const nameTranslation = await translationService.findTranslation({
    table: 'topic_channel',
    field: 'name',
    id,
    language,
  })
  return nameTranslation?.text ?? name
}

export default resolver
