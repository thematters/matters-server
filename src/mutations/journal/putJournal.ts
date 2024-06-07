import type { GQLMutationResolvers } from 'definitions'

import { invalidateFQC } from '@matters/apollo-response-cache'

import { NODE_TYPES } from 'common/enums'
import { AuthenticationError } from 'common/errors'

const resolver: GQLMutationResolvers['putJournal'] = async (
  _,
  { input: { content, assets } },
  {
    viewer,
    dataSources: {
      journalService,
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

  const journal = await journalService.create({ content, assetIds }, viewer)

  invalidateFQC({
    node: { id: viewer.id, type: NODE_TYPES.User },
    redis: redis,
  })

  return journal
}

export default resolver
