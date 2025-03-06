import type { GQLMutationResolvers } from 'definitions/index.js'

import { UserInputError, AuthenticationError } from 'common/errors.js'
import { fromGlobalId } from 'common/utils/index.js'

const resolver: GQLMutationResolvers['putChannel'] = async (
  _,
  { input: { id: globalId, providerId, name, description, enabled } },
  { viewer, dataSources: { translationService, channelService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  let channel
  if (!globalId) {
    // create new channel
    channel = await channelService.updateOrCreateChannel({
      providerId,
      name: name ? name[0].text : '',
      description: description ? description[0].text : '',
      ...(typeof enabled === 'boolean' ? { enabled } : {}),
    })
  } else {
    const { id, type } = fromGlobalId(globalId)
    if (type !== 'Channel') {
      throw new UserInputError('wrong channel global id')
    }

    channel = await channelService.updateOrCreateChannel({
      id,
      providerId,
      name: name ? name[0].text : '',
      description: description ? description[0].text : '',
      ...(typeof enabled === 'boolean' ? { enabled } : {}),
    })
  }

  // create or update translations
  if (name) {
    for (const trans of name) {
      await translationService.updateOrCreateTranslation({
        table: 'channel',
        field: 'name',
        id: channel.id,
        language: trans.language,
        text: trans.text,
      })
    }
  }

  // create or update description translations
  if (description) {
    for (const trans of description) {
      await translationService.updateOrCreateTranslation({
        table: 'channel',
        field: 'description',
        id: channel.id,
        language: trans.language,
        text: trans.text,
      })
    }
  }

  return channel
}

export default resolver
