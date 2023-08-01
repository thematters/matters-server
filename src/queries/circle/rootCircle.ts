import type { GQLQueryResolvers } from 'definitions'

import { CIRCLE_STATE } from 'common/enums'

const resolver: GQLQueryResolvers['circle'] = async (
  _,
  { input: { name } },
  { dataSources: { atomService } }
) => {
  if (!name) {
    return
  }

  const circle = await atomService.findFirst({
    table: 'circle',
    where: { name, state: CIRCLE_STATE.active },
  })

  return circle
}

export default resolver
