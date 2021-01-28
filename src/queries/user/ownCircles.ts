import { CIRCLE_STATE } from 'common/enums'
import { UserToOwnCirclesResolver } from 'definitions'

const resolver: UserToOwnCirclesResolver = async (
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
