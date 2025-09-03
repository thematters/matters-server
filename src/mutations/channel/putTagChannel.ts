import type { GQLMutationResolvers } from '#definitions/index.js'

import { UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['putTagChannel'] = async (
  _,
  { input: { id: globalId, enabled, navbarTitle } },
  { dataSources: { atomService, translationService, channelService } }
) => {
  if (navbarTitle) {
    for (const trans of navbarTitle) {
      if (trans.text.length > 50) {
        throw new UserInputError('Navbar title is too long')
      }
    }
  }

  const { id: tagId, type } = fromGlobalId(globalId)
  if (type !== 'Tag') {
    throw new UserInputError('Wrong tag global ID')
  }

  // Upsert tag_channel
  const tagChannel = await channelService.updateOrCreateTagChannel({
    tagId,
    enabled: enabled ?? undefined,
    navbarTitle: navbarTitle ? navbarTitle[0]?.text : null,
  })

  // Update translations when provided
  if (navbarTitle) {
    for (const trans of navbarTitle) {
      await translationService.updateOrCreateTranslation({
        table: 'tag_channel',
        field: 'navbar_title',
        id: tagChannel.id,
        language: trans.language,
        text: trans.text,
      })
    }
  }

  // Return the Tag node
  return atomService.findUnique({ table: 'tag', where: { id: tagId } })
}

export default resolver
