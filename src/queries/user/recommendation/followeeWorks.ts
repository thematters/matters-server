import { last } from 'lodash'

import { AuthenticationError } from 'common/errors'
import { fromGlobalId, toGlobalId } from 'common/utils'
import { RecommendationToFolloweeWorksResolver } from 'definitions'

export const followeeWorks: RecommendationToFolloweeWorksResolver = async (
  { id }: { id: string },
  { input },
  { dataSources: { articleService, commentService, userService } }
) => {
  if (!id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const after = input.after ? fromGlobalId(input.after).id : null
  const [sources, range] = await Promise.all([
    userService.findFolloweeWorks({ after, userId: id, limit: input.first }),
    userService.findFolloweeWorksRange({ userId: id }),
  ])

  // fetch followee works
  const items = (await Promise.all(
    sources.map((source: { [key: string]: any }) => {
      switch (source.type) {
        case 'Article': {
          return articleService.dataloader.load(source.id)
        }
        case 'Comment': {
          return commentService.dataloader.load(source.id)
        }
        default: {
          return new Promise((resolve) => resolve(undefined))
        }
      }
    })
  )) as Array<
    | {
        [key: string]: any
      }
    | undefined
  >

  // re-process items
  const cleanedItems = items.filter((item) => item) as Array<{
    [key: string]: any
  }>

  const edges = cleanedItems.map((item) => {
    const type = !!item.title ? 'Article' : 'Comment'
    return {
      cursor: toGlobalId({ type, id: item.id }),
      node: { __type: type, ...item },
    }
  })

  // handle page info
  const head = sources[0] as { [key: string]: any }
  const headSeq = head && parseInt(head.seq, 10)

  const tail = last(sources) as { [key: string]: any }
  const tailSeq = tail && parseInt(tail.seq, 10)

  const edgeHead = edges[0]
  const edgeTail = last(edges)

  return {
    edges,
    pageInfo: {
      startCursor: edgeHead ? edgeHead.cursor : '',
      endCursor: edgeTail ? edgeTail.cursor : '',
      hasPreviousPage: headSeq < range.max,
      hasNextPage: tailSeq > range.min,
    },
    totalCount: range.count,
  }
}
