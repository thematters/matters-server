import { DraftAccessToCircleResolver } from 'definitions'

export const circle: DraftAccessToCircleResolver = (
  { circleId },
  _,
  { dataSources: { atomService } }
) => {
  if (!circleId) {
    return
  }

  return atomService.circleIdLoader.load(circleId)
}
