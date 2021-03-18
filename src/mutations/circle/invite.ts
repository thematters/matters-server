import { USER_STATE } from 'common/enums'
import {
  AuthenticationError,
  EntityNotFoundError,
  ForbiddenByStateError,
  ForbiddenError,
  ServerError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToInviteResolver } from 'definitions'

const months = [1, 3, 6, 12]

const resolver: MutationToInviteResolver = async (
  root,
  { input: { invitees, freePeriod, circleId } },
  { dataSources: { atomService, paymentService }, viewer }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permisson')
  }

  if (
    [USER_STATE.archived, USER_STATE.banned, USER_STATE.frozen].includes(
      viewer.state
    )
  ) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  if (!invitees || invitees.length === 0) {
    throw new UserInputError('invitees are required')
  }

  if (!months.includes(freePeriod)) {
    throw new UserInputError('free period is invalid')
  }

  const circleDbId = fromGlobalId(circleId).id
  const circle = await atomService.findUnique({
    table: 'circle',
    where: { id: circleDbId },
  })

  if (!circle) {
    throw new EntityNotFoundError('circle not found')
  }

  if (circle.owner !== viewer.id) {
    throw new ForbiddenError('operation not allowed')
  }

  let coupon = await atomService.findFirst({
    table: 'circle_coupon',
    where: { circleId: circleDbId, durationInMonths: freePeriod },
  })

  // check coupon is existed, if not create Stripe and matters coupon
  if (!coupon) {
    const stripeCoupon = await paymentService.stripe.createCoupon({
      months: freePeriod,
      percentOff: 100,
      productId: circle.providerProductId,
    })

    if (!stripeCoupon) {
      throw new ServerError('failed to create stripe coupon')
    }

    coupon = await atomService.create({
      table: 'circle_coupon',
      data: {
        circleId: circle.id,
        durationInMonths: freePeriod,
        providerCouponId: stripeCoupon.id,
      },
    })

    if (!coupon) {
      throw new ServerError('failed to create matters coupon')
    }
  }

  // process invitations
  const invitations = []
  for (const invitee of invitees) {
    const { id, email } = invitee
    const userId = id ? fromGlobalId(id).id : null

    let invitation = await atomService.findFirst({
      table: 'circle_invitation',
      where: { circleId: circle.id, email, userId },
    })

    // if not existed, create one
    if (!invitation) {
      invitation = await atomService.create({
        table: 'circle_invitation',
        data: {
          circleId: circle.id,
          couponId: coupon.id,
          email,
          inviter: viewer.id,
          userId,
        },
      })
    }

    // if existed, but free period changed
    if (invitation && invitation.couponId !== coupon.id) {
      invitation = await atomService.update({
        table: 'circle_invitation',
        where: { circleId: circle.id, email, userId },
        data: {
          couponId: coupon.id,
          sentAt: new Date(),
          updatedAt: new Date(),
        },
      })
    }

    invitations.push(invitation)
  }

  // TODO: Trigger notices

  // TODO: Send emails

  return invitations
}

export default resolver
