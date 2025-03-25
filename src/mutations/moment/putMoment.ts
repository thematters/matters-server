import type { GQLMutationResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { AuthenticationError } from '#common/errors.js'
import { invalidateFQC } from '@matters/apollo-response-cache'

const resolver: GQLMutationResolvers['putMoment'] = async (
  _,
  { input: { content, assets } },
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

  const assetIds = (await atomService.assetUUIDLoader.loadMany(assets)).map(
    ({ id }) => id
  )

  const moment = await momentService.create({ content, assetIds }, viewer)

  invalidateFQC({
    node: { id: viewer.id, type: NODE_TYPES.User },
    redis: redis,
  })

  return moment
}

export default resolver
