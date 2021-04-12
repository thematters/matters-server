import { DraftToCircleResolver } from 'definitions'

export const circle: DraftToCircleResolver = (
  { circleId },
  _,
  { dataSources: { atomService } }
) => {
  if (!circleId) {
    return
  }

  return atomService.circleIdLoader.load(circleId)
}
