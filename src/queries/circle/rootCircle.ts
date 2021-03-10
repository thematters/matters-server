import { CIRCLE_STATE } from 'common/enums'
import { QueryToCircleResolver } from 'definitions'

const resolver: QueryToCircleResolver = async (
  root,
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
