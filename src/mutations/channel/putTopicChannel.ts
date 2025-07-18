import type { GQLMutationResolvers, TopicChannel } from '#definitions/index.js'

import { UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['putTopicChannel'] = async (
  _,
  {
    input: {
      id: globalId,
      providerId,
      name,
      note,
      navbarTitle,
      enabled,
      subChannels,
    },
  },
  { dataSources: { translationService, channelService } }
) => {
  if (name) {
    for (const trans of name) {
      if (trans.text.length > 32) {
        throw new UserInputError('Name is too long')
      }
    }
  }
  if (note) {
    for (const trans of note) {
      if (trans.text.length > 60) {
        throw new UserInputError('Note is too long')
      }
    }
  }
  if (navbarTitle) {
    for (const trans of navbarTitle) {
      if (trans.text.length > 32) {
        throw new UserInputError('Navbar title is too long')
      }
    }
  }

  let channel: TopicChannel
  if (!globalId) {
    if (!providerId) {
      throw new UserInputError(
        'Provider ID is required for creating topic channel'
      )
    }
    channel = await channelService.createTopicChannel({
      providerId,
      name: name ? name[0]?.text : '',
      note: note ? note[0]?.text : '',
      navbarTitle: navbarTitle ? navbarTitle[0]?.text : undefined,
      enabled: enabled ?? true,
      subChannelIds: subChannels?.map(
        (subChannel) => fromGlobalId(subChannel).id
      ),
    })
  } else {
    const { id, type } = fromGlobalId(globalId)
    if (type !== 'TopicChannel') {
      throw new UserInputError('Wrong channel global ID')
    }

    channel = await channelService.updateTopicChannel({
      id,
      name: name ? name[0]?.text : undefined,
      note: note ? note[0]?.text : undefined,
      navbarTitle: navbarTitle ? navbarTitle[0]?.text : undefined,
      enabled,
      subChannelIds: subChannels?.map(
        (subChannel) => fromGlobalId(subChannel).id
      ),
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

  // create or update navbar title translations
  if (navbarTitle) {
    for (const trans of navbarTitle) {
      await translationService.updateOrCreateTranslation({
        table: 'topic_channel',
        field: 'navbar_title',
        id: channel.id,
        language: trans.language,
        text: trans.text,
      })
    }
  }

  return channel
}

export default resolver
