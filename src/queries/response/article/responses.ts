import _last from 'lodash/last'

import { fromGlobalId, toGlobalId } from 'common/utils'
import { ArticleToResponsesResolver } from 'definitions'

const resolver: ArticleToResponsesResolver = async (
  { articleId },
  { input: { sort, first, ...restParams } },
  { dataSources: { articleService, commentService } }
) => {
  const order = sort === 'oldest' ? 'asc' : 'desc'
  const state = 'active'

  // set default first as 10, and use null for querying all.
  if (!restParams.before && typeof first === 'undefined') {
    first = 8
  }

  let after
  let before
  if (restParams.after) {
    after = fromGlobalId(restParams.after).id
  }
  if (restParams.before) {
    before = fromGlobalId(restParams.before).id
  }

  // fetch order and range based on Collection and Comment
  const { includeAfter, includeBefore, articleOnly } = restParams
  const [sources, range] = await Promise.all([
    articleService.findResponses({
      id: articleId,
      order,
      state,
      after,
      before,
      first,
      includeAfter,
      includeBefore,
      articleOnly,
    }),
    articleService.responseRange({
      id: articleId,
      order,
      state,
    }),
  ])

  // fetch responses
  const items = await Promise.all(
    sources.map((source: { [key: string]: any }) => {
      switch (source.type) {
        case 'Article': {
          return articleService.draftLoader.load(source.entityId)
        }
        case 'Comment': {
          return commentService.baseFindById(source.entityId)
        }
      }
    })
  )

  // re-process edges
  const edges = items.map((item: { [key: string]: any }) => {
    const type = !!item.title ? 'Article' : 'Comment'
    return {
      cursor: toGlobalId({ type, id: item.articleId }),
      node: { __type: type, ...item },
    }
  })

  // handle page info
  const head = sources[0] as { [key: string]: any }
  const headSeq = head && parseInt(head.seq, 10)

  const tail = _last(sources) as { [key: string]: any }
  const tailSeq = tail && parseInt(tail.seq, 10)

  const edgeHead = edges[0]
  const edgeTail = _last(edges)

  return {
    edges,
    totalCount: range.count,
    pageInfo: {
      startCursor: edgeHead ? edgeHead.cursor : '',
      endCursor: edgeTail ? edgeTail.cursor : '',
      hasPreviousPage:
        order === 'asc' ? headSeq > range.min : headSeq < range.max,
      hasNextPage: order === 'asc' ? tailSeq < range.max : tailSeq > range.min,
    },
  }
}

export default resolver
