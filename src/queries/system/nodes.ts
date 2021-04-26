import { GRAPHQL_COST_LIMIT } from 'common/enums'
import {
  ActionLimitExceededError,
  EntityNotFoundError,
  ForbiddenError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { Item, QueryToNodesResolver } from 'definitions'

const resolver: QueryToNodesResolver = async (
  root,
  { input: { ids } },
  {
    viewer,
    dataSources: {
      articleService,
      userService,
      commentService,
      draftService,
      tagService,
    },
  }
) => {
  if (ids.length >= GRAPHQL_COST_LIMIT) {
    throw new ActionLimitExceededError(
      `query exceeds maximum cost ${GRAPHQL_COST_LIMIT}, current: ${ids.length}`
    )
  }

  const articleDbIds: string[] = []
  const articleIds: string[] = []
  const userDbIds: string[] = []
  const userIds: string[] = []
  const commentDbIds: string[] = []
  const commentIds: string[] = []
  const draftDbIds: string[] = []
  const draftIds: string[] = []
  const tagDbIds: string[] = []
  const tagIds: string[] = []
  const globalIds = ids.map((id) => {
    const { type, id: dbId } = fromGlobalId(id)

    switch (type) {
      case 'Article':
        articleDbIds.push(dbId)
        articleIds.push(id)
        break
      case 'User':
        userDbIds.push(dbId)
        userIds.push(id)
        break
      case 'Comment':
        commentDbIds.push(dbId)
        commentIds.push(id)
        break
      case 'Draft':
        draftDbIds.push(dbId)
        draftIds.push(id)
        break
      case 'Tag':
        tagDbIds.push(dbId)
        tagIds.push(id)
        break
    }

    return { type, id }
  })

  // fetch by bulk
  const articles = await articleService.draftLoader.loadMany(articleDbIds)
  const users = await userService.dataloader.loadMany(userDbIds)
  const comments = await commentService.dataloader.loadMany(commentDbIds)
  const drafts = await draftService.dataloader.loadMany(draftDbIds)
  const tags = await tagService.dataloader.loadMany(tagDbIds)

  const nodes = globalIds.map(({ type, id }) => {
    let node: Item | Error | undefined

    switch (type) {
      case 'Article':
        node = articles[articleIds.indexOf(id)]
        break
      case 'User':
        node = users[userIds.indexOf(id)]
        break
      case 'Comment':
        node = comments[commentIds.indexOf(id)]
        break
      case 'Draft':
        node = drafts[draftIds.indexOf(id)]
        break
      case 'Tag':
        node = tags[tagIds.indexOf(id)]
        break
    }

    if (!node || node instanceof Error) {
      throw new EntityNotFoundError('target does not exist')
    }

    if (type === 'Draft' && viewer.id !== node.authorId) {
      throw new ForbiddenError('only author is allowed to view draft')
    }

    return { ...node, __type: type }
  })

  return nodes
}

export default resolver
