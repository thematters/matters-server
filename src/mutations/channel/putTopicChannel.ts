import type { GQLMutationResolvers } from '#definitions/index.js'

import { UserInputError, AuthenticationError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['putTopicChannel'] = async (
  _,
  { input: { id: globalId, name, note, enabled } },
  { viewer, dataSources: { translationService, channelService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  let channel
  if (!globalId) {
    // create new channel
    channel = await channelService.updateOrCreateChannel({
      name: name ? name[0].text : '',
      note: note ? note[0].text : '',
      ...(typeof enabled === 'boolean' ? { enabled } : {}),
    })
  } else {
    const { id, type } = fromGlobalId(globalId)
    if (type !== 'TopicChannel') {
      throw new UserInputError('wrong channel global id')
    }

    channel = await channelService.updateOrCreateChannel({
      id,
      name: name ? name[0].text : '',
      note: note ? note[0].text : '',
      ...(typeof enabled === 'boolean' ? { enabled } : {}),
    })
  }

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
