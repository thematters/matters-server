import type { GQLMutationResolvers } from '#definitions/index.js'

import { UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'
import { isValidDatetimeRange } from '#common/utils/validator.js'

const resolver: GQLMutationResolvers['putCurationChannel'] = async (
  _,
  {
    input: {
      id: globalId,
      name,
      note,
      navbarTitle,
      pinAmount,
      color,
      activePeriod,
      state,
    },
  },
  { dataSources: { translationService, channelService } }
) => {
  if (name) {
    for (const trans of name) {
      if (trans.text.length > 50) {
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
      if (trans.text.length > 50) {
        throw new UserInputError('Navbar title is too long')
      }
    }
  }
  if (activePeriod) {
    if (!isValidDatetimeRange(activePeriod)) {
      throw new UserInputError('Invalid datetime range')
    }
  }

  let channel
  if (!globalId) {
    // create new channel
    channel = await channelService.createCurationChannel({
      name: name ? name[0]?.text : '',
      note: note ? note[0]?.text : '',
      navbarTitle: navbarTitle ? navbarTitle[0]?.text : undefined,
      pinAmount,
      color,
      activePeriod: activePeriod && [activePeriod.start, activePeriod.end],
      state,
    })
  } else {
    const { id, type } = fromGlobalId(globalId)
    if (type !== 'CurationChannel') {
      throw new UserInputError('Wrong channel global ID')
    }
    channel = await channelService.updateCurationChannel({
      id,
      name: name ? name[0]?.text : '',
      note: note ? note[0]?.text : '',
      navbarTitle: navbarTitle ? navbarTitle[0]?.text : undefined,
      pinAmount,
      color,
      activePeriod: activePeriod && [activePeriod.start, activePeriod.end],
      state,
    })
  }

  // create or update translations
  if (name) {
    for (const trans of name) {
      await translationService.updateOrCreateTranslation({
        table: 'curation_channel',
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
        table: 'curation_channel',
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
        table: 'curation_channel',
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
