import type { GQLMutationResolvers } from 'definitions'

import { AuthenticationError } from 'common/errors'

const resolver: GQLMutationResolvers['setCurrency'] = async (
  _,
  { input: { currency } },
  { viewer, dataSources: { atomService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }
  return atomService.update({
    table: 'user',
    where: { id: viewer.id },
    data: { currency },
  })
}

export default resolver
