import _difference from 'lodash/difference'
import _inter from 'lodash/intersection'
import _uniq from 'lodash/uniq'

import { ASSET_TYPE, USER_STATE } from 'common/enums'
import {
  AssetNotFoundError,
  AuthenticationError,
  ForbiddenByStateError,
  ForbiddenError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToPutTopicResolver } from 'definitions'

const resolver: MutationToPutTopicResolver = async (
  _,
  { input: { id, chapters, articles, cover, ...rest } },
  { viewer, dataSources: { atomService, systemService } }
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
    cover?: string
  }

  // map cover to cover id
  if (cover) {
    const asset = await systemService.findAssetByUUID(cover)
    if (
      !asset ||
      asset.type !== ASSET_TYPE.topicCover ||
      asset.authorId !== viewer.id
    ) {
      throw new AssetNotFoundError('topic cover asset does not exists')
    }
    properties.cover = asset.id
  }

  /**
   * update
   * when id is provided
   */
  if (id) {
    const { id: topicDbId } = fromGlobalId(id)
    let topic = await atomService.findUnique({
      table: 'topic',
      where: { id: topicDbId },
    })

    if (topic.userId !== viewer.id) {
      throw new AuthenticationError('users can only update their own topics')
    }

    // update properties in topic table
    if (Object.keys(properties).length > 0) {
      topic = await atomService.update({
        table: 'topic',
        where: { id: topicDbId },
        data: properties,
      })
    }

    // update chapter order in chapter table
    if (chapters && chapters.length > 0) {
      await Promise.all(
        chapters.map((chapter, index) =>
          atomService.update({
            table: 'chapter',
            where: { id: fromGlobalId(chapter).id, topicId: topicDbId },
            data: { order: index, updatedAt: new Date() },
          })
        )
      )
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
          table: 'article_topic',
          where: { topicId: topicDbId },
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
            table: 'article_topic',
            where: { topicId: topicDbId, articleId },
            data: { order: newIds.indexOf(articleId), updatedAt: new Date() },
          })
        )
      )

      // create
      await Promise.all(
        addIds.map((articleId) =>
          atomService.create({
            table: 'article_topic',
            data: {
              topicId: topicDbId,
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
            table: 'article_topic',
            where: {
              topicId: topicDbId,
              articleId,
            },
          })
        )
      )
    }
    return topic
  }

  /**
   * create
   * when id is provided
   */
  if (!id) {
    // check input validity
    if (!rest.title) {
      throw new UserInputError('Title is required for creating topic.')
    }

    if (chapters && chapters.length > 0) {
      throw new UserInputError(
        'Cannot add chapter when creating topic. Use `putChapter` after creating topic.'
      )
    }

    // create record in topic table
    const newTopic = await atomService.create({
      table: 'topic',
      data: { userId: viewer.id, ...properties },
    })

    // create references to articles in article_topic
    if (articles && articles.length > 0) {
      await Promise.all(
        articles.map((article, index) =>
          atomService.create({
            table: 'article_topic',
            data: {
              topicId: newTopic.id,
              articleId: fromGlobalId(article).id,
              order: index,
            },
          })
        )
      )
    }
    return newTopic
  }
}

export default resolver
