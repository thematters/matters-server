import type { GQLUserResolvers, Article, Moment } from 'definitions'

import { DEFAULT_TAKE_PER_PAGE, NODE_TYPES } from 'common/enums'
import { ServerError } from 'common/errors'
import { fromGlobalId, toGlobalId } from 'common/utils'

const resolver: GQLUserResolvers['writings'] = async (
  { id },
  { input },
  { dataSources: { userWorkService, atomService } }
) => {
  const take = input.first ?? DEFAULT_TAKE_PER_PAGE
  const after = input.after ? fromGlobalId(input.after) : undefined
  const [records, totalCount, hasNextPage] = await userWorkService.findWritings(
    id,
    { take, after }
  )

  // gen nodes
  const nodes = await Promise.all(
    records.map((record) => {
      switch (record.type) {
        case 'Article': {
          return atomService.articleIdLoader.load(record.id)
        }
        case 'Moment': {
          return atomService.momentIdLoader.load(record.id)
        }
        default: {
          throw new ServerError(`Unknown response type: ${record.type}`)
        }
      }
    })
  )

  // gen edges
  const isArticle = (node: Article | Moment): node is Article =>
    'shortHash' in node
  const edges = nodes.map((node) => {
    const type = isArticle(node) ? NODE_TYPES.Article : NODE_TYPES.Moment
    return {
      cursor: toGlobalId({ type, id: node.id }),
      node: { __type: type, ...node },
    }
  })

  return {
    edges,
    totalCount,
    pageInfo: {
      startCursor: edges.length > 0 ? edges[0].cursor : null,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
      hasNextPage,
      hasPreviousPage: after ? true : false,
    },
  }
}

export default resolver
