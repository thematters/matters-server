import { CircleToIsMemberResolver } from 'definitions'

const resolver: CircleToIsMemberResolver = async (
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
