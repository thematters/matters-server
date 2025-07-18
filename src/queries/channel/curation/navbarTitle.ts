import type { GQLCurationChannelResolvers } from '#definitions/index.js'

const resolver: GQLCurationChannelResolvers['navbarTitle'] = async (
  { id, name, navbarTitle },
  { input },
  { viewer, dataSources: { translationService } }
) => {
  const language = input?.language || viewer.language
  const navbarTitleTranslation = await translationService.findTranslation({
    table: 'curation_channel',
    field: 'navbar_title',
    id,
    language,
  })
  const nameTranslation = await translationService.findTranslation({
    table: 'curation_channel',
    field: 'name',
    id,
    language,
  })
  return (
    navbarTitleTranslation?.text ?? nameTranslation?.text ?? navbarTitle ?? name
  )
}

export default resolver
