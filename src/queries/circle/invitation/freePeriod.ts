import { InvitationToFreePeriodResolver } from 'definitions'

const resolver: InvitationToFreePeriodResolver = async (
  { couponId },
  _,
  { dataSources: { atomService } }
) => {
  const coupon = await atomService.findUnique({
    table: 'circle_coupon',
    where: { id: couponId },
  })
  return coupon.durationInMonths
}

export default resolver
