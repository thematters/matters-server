import type { GQLQueryResolvers } from '#definitions/index.js'

import { CIRCLE_STATE } from '#common/enums/index.js'

const resolver: GQLQueryResolvers['circle'] = async (
  _,
  { input: { name } },
  { dataSources: { atomService } }
) => {
  if (!name) {
    return null
  }

  const circle = await atomService.findFirst({
    table: 'circle',
    where: { name, state: CIRCLE_STATE.active },
  })

  return circle
}

export default resolver
