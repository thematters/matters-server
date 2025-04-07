import type { GQLMutationResolvers } from '#definitions/index.js'

import { UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['putTopicChannel'] = async (
  _,
  { input: { id: globalId, name, note, enabled } },
  { dataSources: { translationService, channelService } }
) => {
  const { id, type } = fromGlobalId(globalId)
  if (type !== 'TopicChannel') {
    throw new UserInputError('Wrong channel global ID')
  }

  const channel = await channelService.updateTopicChannel({
    id,
    name: name ? name[0].text : undefined,
    note: note ? note[0].text : undefined,
    enabled,
  })

  // create or update translations
  if (name) {
    for (const trans of name) {
      await translationService.updateOrCreateTranslation({
        table: 'topic_channel',
        field: 'name',
        id: channel.id,
        language: trans.language,
        text: trans.text,
      })
    }
  }

  // create or update note translations
  if (note) {
    for (const trans of note) {
      await translationService.updateOrCreateTranslation({
        table: 'topic_channel',
        field: 'note',
        id: channel.id,
        language: trans.language,
        text: trans.text,
      })
    }
  }

  return channel
}

export default resolver
