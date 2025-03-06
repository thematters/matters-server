import type { GQLCircleResolvers } from 'definitions/index.js'

const resolver: GQLCircleResolvers['isMember'] = async (
  { id },
  _,
  { viewer, dataSources: { paymentService } }
) => {
  if (!viewer.id) {
    return false
  }

  return paymentService.isCircleMember({
    userId: viewer.id,
    circleId: id,
  })
}

export default resolver
