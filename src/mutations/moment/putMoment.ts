import type { GQLMutationResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { AuthenticationError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'

const resolver: GQLMutationResolvers['putMoment'] = async (
  _,
  { input: { content, assets, tags, articles } },
  {
    viewer,
    dataSources: {
      momentService,
      atomService,
      connections: { redis },
    },
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const assetIds = (await atomService.assetUUIDLoader.loadMany(assets || [])).map(
    ({ id }) => id
  )

  // map article global IDs to raw IDs if provided
  // articles input is optional; if present we use only the first
  const articleIds = articles ? articles.map((gid) => fromGlobalId(gid).id) : undefined

  const moment = await momentService.create(
    { content, assetIds, tags, articleIds },
    viewer
  )

  invalidateFQC({
    node: { id: viewer.id, type: NODE_TYPES.User },
    redis: redis,
  })

  return moment
}

export default resolver
