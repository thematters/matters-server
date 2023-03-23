import _difference from 'lodash/difference.js'
import _inter from 'lodash/intersection.js'
import _uniq from 'lodash/uniq.js'

import { ForbiddenError } from 'common/errors.js'
import { fromGlobalId } from 'common/utils/index.js'
import { MutationToSortTopicsResolver } from 'definitions'

const resolver: MutationToSortTopicsResolver = async (
  _,
  { input: { ids } },
  { viewer, dataSources: { atomService } }
) => {
  const topicIds = _uniq(ids.map((id) => fromGlobalId(id).id))

  // check permission
  const topics = await atomService.findMany({
    table: 'topic',
    whereIn: ['id', topicIds],
  })
  topics.forEach((topic) => {
    if (topic.userId !== viewer.id) {
      throw new ForbiddenError('viewer has no permission')
    }
  })

  // remake orders
  const userTopics = await atomService.findMany({
    table: 'topic',
    where: { user_id: viewer.id },
    orderBy: [{ column: 'order', order: 'asc' }],
  })
  const userTopicIds = userTopics.map((topic) => topic.id)
  const restIds = _difference(userTopicIds, topicIds)
  const newOrderedTopicIds = [...topicIds, ...restIds]

  // update orders
  await Promise.all(
    newOrderedTopicIds.map((topicId, index) =>
      atomService.update({
        table: 'topic',
        where: { id: topicId },
        data: {
          order: index,
          updatedAt: new Date(),
        },
      })
    )
  )

  return atomService.findMany({
    table: 'topic',
    where: { user_id: viewer.id },
    orderBy: [{ column: 'order', order: 'asc' }],
  })
}

export default resolver
