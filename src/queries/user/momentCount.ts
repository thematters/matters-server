import type { GQLUserStatusResolvers } from '#definitions/index.js'

import { MOMENT_STATE } from '#common/enums/index.js'

const resolver: GQLUserStatusResolvers['momentCount'] = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  const count = await atomService.count({
    table: 'moment',
    where: { authorId: id, state: MOMENT_STATE.active },
  })
  return count
}

export default resolver
