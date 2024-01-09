import type { GQLArticleResolvers, Draft, Comment } from 'definitions'

import _last from 'lodash/last'

import { NODE_TYPES } from 'common/enums'
import { ServerError } from 'common/errors'
import { fromGlobalId, toGlobalId } from 'common/utils'

const resolver: GQLArticleResolvers['responses'] = async (
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
    sources.map((source: { entityId: string; type: string }) => {
      switch (source.type) {
        case 'Article': {
          return articleService.draftLoader.load(
            source.entityId
          ) as Promise<Draft>
        }
        case 'Comment': {
          return commentService.loadById(source.entityId)
        }
        default: {
          throw new ServerError(`Unknown response type: ${source.type}`)
        }
      }
    })
  )

  // re-process edges
  const isDraft = (item: Draft | Comment): item is Draft =>
    Object.prototype.hasOwnProperty.call(item, 'articleId')
  const edges = items.map((item) => {
    const type = isDraft(item) ? NODE_TYPES.Article : NODE_TYPES.Comment
    const id = isDraft(item) ? item.articleId : item.id

    return {
      cursor: toGlobalId({ type, id }),
      node: { __type: type, ...item } as any,
    }
  })

  // handle page info
  const head = sources[0]
  const headSeq = head && parseInt(head.seq, 10)

  const tail = _last(sources)
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
