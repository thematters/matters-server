import type { GQLDraftAccessResolvers, Circle } from 'definitions'

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
