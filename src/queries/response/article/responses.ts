import type {
  GQLArticleResolvers,
  Article,
  Comment,
  GlobalId,
} from '#definitions/index.js'

import { COMMENT_TYPE, NODE_TYPES } from '#common/enums/index.js'
import { ServerError } from '#common/errors.js'
import { fromGlobalId, toGlobalId } from '#common/utils/index.js'
import _last from 'lodash/last.js'

const resolver: GQLArticleResolvers['responses'] = async (
  { id: articleId },
  { input: { sort, first, ...restParams } },
  { viewer, dataSources: { articleService, atomService, commentService } }
) => {
  const order = sort === 'oldest' ? 'asc' : 'desc'

  // set default first as 10, and use null for querying all.
  if (!restParams.before && typeof first === 'undefined') {
    first = 8
  }

  let after
  let before
  if (restParams.after) {
    after = fromGlobalId(restParams.after as GlobalId)
  }
  if (restParams.before) {
    before = fromGlobalId(restParams.before as GlobalId)
  }

  // fetch order and range based on Collection and Comment
  const { includeAfter, includeBefore, articleOnly } = restParams
  const sources = await articleService.findResponses({
    id: articleId,
    order,
    after,
    before,
    first,
    includeAfter,
    includeBefore,
    articleOnly,
  })
  const [articleResponseCount, commentResponseCount] = await Promise.all([
    articleService.countActiveConnectedBy(articleId),
    articleOnly
      ? Promise.resolve(0)
      : commentService.count(articleId, COMMENT_TYPE.article, {
          includeRestrictedAuthors: viewer.hasRole('admin'),
        }),
  ])

  // fetch responses
  const loadedItems = await Promise.all(
    sources.map((source: { entityId: string; type: string }) => {
      switch (source.type) {
        case 'Article': {
          return atomService.articleIdLoader.load(source.entityId)
        }
        case 'Comment': {
          return atomService.commentIdLoader.load(source.entityId)
        }
        default: {
          throw new ServerError(`Unknown response type: ${source.type}`)
        }
      }
    })
  )
  const items = (
    await Promise.all(
      loadedItems.map(async (item) => {
        const isComment = 'articleId' in item
        if (
          isComment &&
          !viewer.hasRole('admin') &&
          (await commentService.isAuthorRestricted(item))
        ) {
          return null
        }
        return item
      })
    )
  ).filter(Boolean) as Array<Article | Comment>

  // re-process edges
  const isArticle = (item: Article | Comment): item is Article =>
    !('articleId' in item)
  const edges = items.map((item) => {
    const type = isArticle(item) ? NODE_TYPES.Article : NODE_TYPES.Comment

    return {
      cursor: toGlobalId({ type, id: item.id }),
      node: { __type: type, ...item } as any,
    }
  })

  // handle page info
  if (!sources.length) {
    return {
      edges: [],
      totalCount: 0,
      pageInfo: {
        startCursor: '',
        endCursor: '',
        hasPreviousPage: false,
        hasNextPage: false,
      },
    }
  }

  const head = sources[0]
  const headCursor = head && head.createdAt

  const tail = _last(sources)
  const tailCursor = tail && tail.createdAt

  const edgeHead = edges[0]
  const edgeTail = _last(edges)

  return {
    edges,
    totalCount: articleResponseCount + commentResponseCount,
    pageInfo: {
      startCursor: edgeHead ? edgeHead.cursor : '',
      endCursor: edgeTail ? edgeTail.cursor : '',
      hasPreviousPage:
        order === 'asc'
          ? headCursor > head.minCursor
          : headCursor < head.maxCursor,
      hasNextPage:
        order === 'asc'
          ? tailCursor < head.maxCursor
          : tailCursor > head.minCursor,
    },
  }
}

export default resolver
