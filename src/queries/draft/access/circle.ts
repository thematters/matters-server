import type { GQLDraftAccessResolvers, Circle } from '#definitions/index.js'

export const circle: GQLDraftAccessResolvers['circle'] = (
  { circleId },
  _,
  { dataSources: { atomService } }
) => {
  if (!circleId) {
    return null
  }

  return atomService.circleIdLoader.load(circleId) as Promise<Circle>
}
