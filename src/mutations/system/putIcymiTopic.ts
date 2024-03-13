import type { GQLMutationResolvers } from 'definitions'

import { MATTERS_CHOICE_TOPIC_STATE } from 'common/enums'
import { UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['putIcymiTopic'] = async (
  _,
  { input: { id: globalId, title, articles, pinAmount, note, state } },
  { dataSources: { recommendationService } }
) => {
  if (!globalId) {
    // create
    if (!title) {
      throw new UserInputError('title is required')
    }
    if (!pinAmount) {
      throw new UserInputError('pinAmount is required')
    }
    const topic = await recommendationService.createIcymiTopic({
      title,
      articleIds: (articles ?? []).map((article) => fromGlobalId(article).id),
      pinAmount,
      note,
    })

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
    const topic = await recommendationService.updateIcymiTopic(id, {
      title,
      articleIds: (articles ?? []).map((article) => fromGlobalId(article).id),
      pinAmount,
      note,
    })

    if (state === MATTERS_CHOICE_TOPIC_STATE.published) {
      return recommendationService.publishIcymiTopic(topic.id)
    } else {
      // state === MATTERS_CHOICE_TOPIC_STATE.editing or undefined
      return topic
    }
  }
}

export default resolver
