import type { GQLOssResolvers } from '#definitions/index.js'
import type { Knex } from 'knex'

import { connectionFromQuery } from '#common/utils/connections.js'

export const spamRings: GQLOssResolvers['spamRings'] = async (
  _,
  { input },
  { dataSources: { spamRingService } }
) => {
  const query: Knex.QueryBuilder = spamRingService.findRings({
    status: input?.filter?.status ?? undefined,
    actionable: input?.filter?.actionable ?? undefined,
  })

  let orderBy: { column: string; order: 'asc' | 'desc' }
  switch (input?.sort) {
    case 'detectedAt':
      orderBy = { column: 'detectedAt', order: 'desc' }
      break
    case 'frozenAt':
      orderBy = { column: 'frozenAt', order: 'desc' }
      break
    case 'nAuthors':
      orderBy = { column: 'nAuthors', order: 'desc' }
      break
    case 'score':
      orderBy = { column: 'score', order: 'desc' }
      break
    default:
      orderBy = { column: 'detectedAt', order: 'desc' }
      break
  }

  return connectionFromQuery({ query, args: input, orderBy })
}
