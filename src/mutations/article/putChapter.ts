import { UserInputError } from 'apollo-server-core'

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
      where: { id: fromGlobalId(chapter.topicId).id },
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

    // update article order or insert new articles in article_chapter table
    if (articles && articles.length > 0) {
      await Promise.all(
        articles.map((article, index) =>
          atomService.upsert({
            table: 'article_chapter',
            where: {
              chapterId: chapterDbId,
              articleId: fromGlobalId(article).id,
            },
            update: { order: index, updatedAt: new Date() },
            create: {
              chapterId: chapterDbId,
              articleId: fromGlobalId(article).id,
              order: index,
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

    const { id: topicDbId } = fromGlobalId(topicGlobalId)

    // check access
    const topic = await atomService.findUnique({
      table: 'topic',
      where: { id: topicDbId },
    })

    if (topic.userId !== viewer.id) {
      throw new AuthenticationError(
        'users can only create chapter in their own topics'
      )
    }

    // get default order
    const order =
      (await atomService.max({
        table: 'chapter',
        column: 'order',
        where: { topicId: topicDbId },
      })) + 1

    // create record in chapter table
    const chapter = await atomService.create({
      table: 'chapter',
      data: { userId: viewer.id, order, ...properties },
    })

    // create references to articles in article_chapter
    if (articles && articles.length > 0) {
      await Promise.all(
        articles.map((article, index) =>
          atomService.create({
            table: 'article_topic',
            data: {
              chapterId: chapter.id,
              articleId: fromGlobalId(article).id,
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
