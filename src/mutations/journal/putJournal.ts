import type { GQLMutationResolvers } from 'definitions'

import { AuthenticationError } from 'common/errors'

const resolver: GQLMutationResolvers['putJournal'] = async (
  _,
  { input: { content, assets } },
  { viewer, dataSources: { journalService, atomService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const assetIds = (await atomService.assetUUIDLoader.loadMany(assets)).map(
    ({ id }) => id
  )

  return journalService.create({ content, assetIds }, viewer)
}

export default resolver
