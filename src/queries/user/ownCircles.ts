import type { GQLUserResolvers } from '#definitions/index.js'

import { CIRCLE_STATE } from '#common/enums/index.js'

const resolver: GQLUserResolvers['ownCircles'] = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  if (!id) {
    return []
  }

  const circles = await atomService.findMany({
    table: 'circle',
    where: { owner: id, state: CIRCLE_STATE.active },
  })

  return circles
}

export default resolver
