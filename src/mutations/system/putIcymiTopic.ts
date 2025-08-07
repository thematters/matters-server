import type { GQLMutationResolvers } from '#definitions/index.js'

import { MATTERS_CHOICE_TOPIC_STATE } from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['putIcymiTopic'] = async (
  _,
  { input: { id: globalId, title, articles, pinAmount, note, state } },
  { dataSources: { recommendationService, translationService } }
) => {
  if (title) {
    for (const trans of title) {
      if (trans.text.length > 100) {
        throw new UserInputError('Title is too long')
      }
    }
  }
  if (note) {
    for (const trans of note) {
      if (trans.text.length > 200) {
        throw new UserInputError('Note is too long')
      }
    }
  }

  let topic
  if (!globalId) {
    // create
    if (!title) {
      throw new UserInputError('title is required')
    }
    if (!pinAmount) {
      throw new UserInputError('pinAmount is required')
    }
    topic = await recommendationService.createIcymiTopic({
      title: title[0]?.text || '',
      articleIds: (articles ?? []).map((article) => fromGlobalId(article).id),
      pinAmount,
      note: note ? note[0]?.text : undefined,
    })

    // create translations
    if (title) {
      for (const trans of title) {
        await translationService.updateOrCreateTranslation({
          table: 'matters_choice_topic',
          field: 'title',
          id: topic.id,
          language: trans.language,
          text: trans.text,
        })
      }
    }

    if (note) {
      for (const trans of note) {
        await translationService.updateOrCreateTranslation({
          table: 'matters_choice_topic',
          field: 'note',
          id: topic.id,
          language: trans.language,
          text: trans.text,
        })
      }
    }

    if (state === MATTERS_CHOICE_TOPIC_STATE.published) {
      return recommendationService.publishIcymiTopic(topic.id)
    } else {
      // state === MATTERS_CHOICE_TOPIC_STATE.editing or undefined
      return topic
    }
  } else {
    // update
    const id = fromGlobalId(globalId).id
    if (state === MATTERS_CHOICE_TOPIC_STATE.archived) {
      return recommendationService.archiveIcymiTopic(id)
    }
    topic = await recommendationService.updateIcymiTopic(id, {
      title: title ? title[0]?.text : undefined,
      articleIds: articles
        ? articles.map((article) => fromGlobalId(article).id)
        : undefined,
      pinAmount,
      note: note ? note[0]?.text : undefined,
    })

    // create or update translations
    if (title) {
      for (const trans of title) {
        await translationService.updateOrCreateTranslation({
          table: 'matters_choice_topic',
          field: 'title',
          id: topic.id,
          language: trans.language,
          text: trans.text,
        })
      }
    }

    if (note) {
      for (const trans of note) {
        await translationService.updateOrCreateTranslation({
          table: 'matters_choice_topic',
          field: 'note',
          id: topic.id,
          language: trans.language,
          text: trans.text,
        })
      }
    }

    if (state === MATTERS_CHOICE_TOPIC_STATE.published) {
      return recommendationService.publishIcymiTopic(topic.id)
    } else {
      // state === MATTERS_CHOICE_TOPIC_STATE.editing or undefined
      return topic
    }
  }
}

export default resolver
