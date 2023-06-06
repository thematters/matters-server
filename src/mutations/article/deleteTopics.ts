import { invalidateFQC } from '@matters/apollo-response-cache'
import _uniq from 'lodash/uniq'

import { NODE_TYPES } from 'common/enums'
import { ForbiddenError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { redis } from 'connectors'
import { MutationToDeleteTopicsResolver } from 'definitions'

const resolver: MutationToDeleteTopicsResolver = async (
  root,
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

  // delete chapters
  const chapters = await atomService.findMany({
    table: 'chapter',
    whereIn: ['topic_id', topicIds],
  })
  const chapterIds = chapters.map((c) => c.id)
  await atomService.deleteMany({
    table: 'article_chapter',
    whereIn: ['chapter_id', chapterIds],
  })
  await atomService.deleteMany({
    table: 'chapter',
    whereIn: ['id', chapterIds],
  })

  // delete articles
  await atomService.deleteMany({
    table: 'article_topic',
    whereIn: ['topic_id', topicIds],
  })

  // delete topics
  await atomService.deleteMany({
    table: 'topic',
    whereIn: ['id', topicIds],
  })

  // manually invalidate cache since it returns nothing
  await Promise.all(
    topicIds.map((id) =>
      invalidateFQC({
        node: { type: NODE_TYPES.Topic, id },
        redis: { client: redis },
      })
    )
  )

  return true
}

export default resolver
