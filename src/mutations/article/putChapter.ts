import { UserInputError } from 'apollo-server-core'
import _difference from 'lodash/difference'
import _inter from 'lodash/intersection'
import _uniq from 'lodash/uniq'

import { USER_STATE } from 'common/enums'
import {
  AuthenticationError,
  ForbiddenByStateError,
  ForbiddenError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToPutChapterResolver } from 'definitions'

const resolver: MutationToPutChapterResolver = async (
  _,
  { input: { id, articles, topic: topicGlobalId, ...rest } },
  { viewer, dataSources: { atomService } }
) => {
  // access control
  if (!viewer.id) {
    throw new ForbiddenError('visitor has no permission')
  }

  if (viewer.state === USER_STATE.frozen) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  // prepare data
  const properties = { updatedAt: new Date(), ...rest } as typeof rest & {
    updatedAt: Date
    topicId: string
  }

  /**
   * update
   * when id is provided
   */
  if (id) {
    const { id: chapterDbId } = fromGlobalId(id)
    let chapter = await atomService.findUnique({
      table: 'chapter',
      where: { id: chapterDbId },
    })

    const topic = await atomService.findUnique({
      table: 'topic',
      where: { id: chapter.topicId },
    })

    // check topic ownership
    if (topic.userId !== viewer.id) {
      throw new AuthenticationError(
        'users can only update chapters in their own topics'
      )
    }

    // if a new topic id is provided, we are moving to a new topic
    if (topicGlobalId && fromGlobalId(topicGlobalId).id !== chapter.topicId) {
      const newTopic = await atomService.findUnique({
        table: 'topic',
        where: { id: fromGlobalId(topicGlobalId).id },
      })

      // check new topic ownership
      if (newTopic.userId !== viewer.id) {
        throw new AuthenticationError(
          'users can only update chapters in their own topics'
        )
      }

      // add to properties
      properties.topicId = newTopic.id
    }

    // update properties in chapterDbId table
    if (Object.keys(properties).length > 0) {
      chapter = await atomService.update({
        table: 'chapter',
        where: { id: chapterDbId },
        data: properties,
      })
    }

    // update article order or insert new articles in article_topic table
    if (articles && articles.length > 0) {
      // get unique ids from input
      const newIds = _uniq(articles).map(
        (globalId) => fromGlobalId(globalId).id
      )

      // get existing articles
      const oldIds = (
        await atomService.findMany({
          table: 'article_chapter',
          where: { chapterId: chapterDbId },
        })
      ).map((record) => record.articleId)

      // determine articles to be removed, added and updated
      const addIds = _difference(newIds, oldIds)
      const removeIds = _difference(oldIds, newIds)
      const updateIds = _inter(newIds, oldIds)

      // updated
      await Promise.all(
        updateIds.map((articleId) =>
          atomService.update({
            table: 'article_chapter',
            where: { chapterId: chapterDbId, articleId },
            data: { order: newIds.indexOf(articleId), updatedAt: new Date() },
          })
        )
      )

      // create
      await Promise.all(
        addIds.map((articleId) =>
          atomService.create({
            table: 'article_chapter',
            data: {
              chapterId: chapterDbId,
              articleId,
              order: newIds.indexOf(articleId),
            },
          })
        )
      )

      // remove
      await Promise.all(
        removeIds.map((articleId) =>
          atomService.deleteMany({
            table: 'article_chapter',
            where: {
              chapterId: chapterDbId,
              articleId,
            },
          })
        )
      )
    }

    return chapter
  }

  /**
   * create
   * when id is provided
   */
  if (!id) {
    // check input validity
    if (!rest.title || !topicGlobalId) {
      throw new UserInputError(
        'Title and topic is required for creating chapter.'
      )
    }

    // check topic
    const { id: topicDbId } = fromGlobalId(topicGlobalId)

    const topic = await atomService.findUnique({
      table: 'topic',
      where: { id: topicDbId },
    })

    if (!topic) {
      throw new UserInputError('Topic not found')
    }

    if (topic.userId !== viewer.id) {
      throw new AuthenticationError(
        'users can only create chapter in their own topics'
      )
    }

    properties.topicId = topic.id

    // get default order
    const order =
      ((await atomService.max({
        table: 'chapter',
        column: 'order',
        where: { topicId: topicDbId },
      })) || 0) + 1

    // create record in chapter table
    const chapter = await atomService.create({
      table: 'chapter',
      data: { order, ...properties },
    })

    // create references to articles in article_chapter
    if (articles && articles.length > 0) {
      // get unique ids from input
      const ids = _uniq(articles).map((globalId) => fromGlobalId(globalId).id)
      await Promise.all(
        ids.map((articleId, index) =>
          atomService.create({
            table: 'article_chapter',
            data: {
              chapterId: chapter.id,
              articleId,
              order: index,
            },
          })
        )
      )
    }
    return chapter
  }
}

export default resolver
