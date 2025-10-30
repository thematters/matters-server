import type { GQLOssResolvers } from '#definitions/index.js'

import { connectionFromQuery } from '#common/utils/index.js'

export const moments: GQLOssResolvers['moments'] = async (
  _,
  { input },
  { dataSources: { momentService } }
) => {
  return connectionFromQuery({
    query: momentService.findMoments(),
    orderBy: { column: 'id', order: 'desc' },
    args: input,
  })
}
