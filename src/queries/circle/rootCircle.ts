import { CIRCLE_STATE } from 'common/enums/index.js'
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
