import type { GQLMutationResolvers } from 'definitions'

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

const resolver: GQLMutationResolvers['putTopic'] = async (
  _,
  { input: { id, chapters, articles, cover, ...rest } },
  {
    viewer,
    dataSources: {
      atomService,
      systemService,
      connections: { knex },
    },
  }
) => {
  // access control
  if (!viewer.userName) {
    throw new ForbiddenError('user has no username')
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

    if (!topic) {
      throw new UserInputError('cannot find topic.')
    }

    if (topic.userId !== viewer.id) {
      throw new AuthenticationError('users can only update their own topics.')
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
      // get chapter db ids
      const chapterDbIds = _uniq(chapters).map(
        (chapterGlobalId) => fromGlobalId(chapterGlobalId).id
      )

      // join to get topic owner
      const chapterObjs = await knex
        .select('chapter.id', 'topic.user_id')
        .from('chapter')
        .join('topic', 'chapter.topic_id', 'topic.id')
        .whereIn('chapter.id', chapterDbIds)

      // check validity
      if (chapterObjs.length !== chapterDbIds.length) {
        throw new UserInputError('some chapters cannot be found.')
      }

      chapterObjs.map((chapter) => {
        if (chapter.userId !== viewer.id) {
          throw new AuthenticationError(
            'users can only update their own chapters.'
          )
        }
      })

      // update record
      await Promise.all(
        chapterDbIds.map((chapterDbId, index) =>
          atomService.update({
            table: 'chapter',
            where: { id: chapterDbId, topicId: topicDbId },
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

      // check validity of added articles
      const articlesObjs = await atomService.findMany({
        table: 'article',
        whereIn: ['id', addIds],
      })

      if (articlesObjs.length !== addIds.length) {
        throw new UserInputError('some articles cannot be found.')
      }

      articlesObjs.map((articleObj) => {
        if (articleObj.authorId !== viewer.id) {
          throw new AuthenticationError(
            'users can only update their own articles.'
          )
        }
      })

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
  } else {
    /**
     * create
     * when id is not provided
     */

    // check input validity
    if (!rest.title) {
      throw new UserInputError('Title is required for creating topic.')
    }

    if (chapters && chapters.length > 0) {
      throw new UserInputError(
        'Cannot add chapter when creating topic. Use `putChapter` after creating topic.'
      )
    }

    // update orders
    const userTopics = await atomService.findMany({
      table: 'topic',
      where: { userId: viewer.id },
    })
    await Promise.all(
      userTopics.map((topic) =>
        atomService.update({
          table: 'topic',
          where: { id: topic.id },
          data: {
            order: topic.order + 1,
          },
        })
      )
    )

    // create record in topic table
    const newTopic = await atomService.create({
      table: 'topic',
      data: { userId: viewer.id, order: 0, ...properties },
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
