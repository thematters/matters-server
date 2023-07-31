import type { GQLDraftAccessResolvers } from 'definitions'

export const circle: GQLDraftAccessResolvers['circle'] = (
  { circleId },
  _,
  { dataSources: { atomService } }
) => {
  if (!circleId) {
    return
  }

  return atomService.circleIdLoader.load(circleId)
}
