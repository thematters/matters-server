import { DraftToCircleResolver } from 'definitions'

const resolver: DraftToCircleResolver = (
  { circleId },
  _,
  { dataSources: { atomService } }
) => {
  if (!circleId) {
    return
  }

  return atomService.circleIdLoader.load(circleId)
}

export default resolver
