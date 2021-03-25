import {
  CIRCLE_INVITATION_VERIFICATION_CODE_EXPIRED_AFTER,
  CIRCLE_STATE,
  DB_NOTICE_TYPE,
  USER_STATE,
  VERIFICATION_CODE_TYPES,
} from 'common/enums'
import {
  AuthenticationError,
  EntityNotFoundError,
  ForbiddenByStateError,
  ForbiddenError,
  ServerError,
  UserInputError,
} from 'common/errors'
import {
  fromGlobalId,
  generateRegisterRedirectUrl,
  makeUserName,
} from 'common/utils'
import { MutationToInviteResolver } from 'definitions'

const months = [1, 3, 6, 12]

const resolver: MutationToInviteResolver = async (
  root,
  { input: { invitees, freePeriod, circleId } },
  {
    dataSources: {
      atomService,
      paymentService,
      notificationService,
      userService,
    },
    viewer,
  }
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
  const circle = await atomService.findFirst({
    table: 'circle',
    where: { id: circleDbId, state: CIRCLE_STATE.active },
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

    // skip if it's marked already
    if (email) {
      const isSkipped = await atomService.findFirst({
        table: 'blocklist',
        where: { type: 'email', value: email, archived: false },
      })

      if (isSkipped) {
        // skip if it's in marked already
        continue
      }
    }

    let invitation = await atomService.findFirst({
      table: 'circle_invitation',
      where: { circleId: circle.id, email, userId, accepted: false },
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
        },
      })
    }

    invitations.push(invitation)
  }

  // send notifications
  for (const invitation of invitations) {
    let code
    let recipient
    let redirectUrl
    const { email, userId } = invitation

    if (userId) {
      recipient = await atomService.findFirst({
        table: 'user',
        where: { id: userId, state: USER_STATE.active },
      })
    } else {
      recipient = await atomService.findFirst({
        table: 'user',
        where: { email, state: USER_STATE.active },
      })
    }

    // if user not found by id and email, then generate code
    if (!recipient && email) {
      code = await userService.createVerificationCode({
        email,
        type: VERIFICATION_CODE_TYPES.register,
        strong: true,
        expiredAt: new Date(
          Date.now() + CIRCLE_INVITATION_VERIFICATION_CODE_EXPIRED_AFTER
        ),
      })

      const tempDisplayName = makeUserName(email)
      redirectUrl = generateRegisterRedirectUrl({
        email,
        displayName: tempDisplayName,
      })
    }

    // send notification to invitee
    if (recipient) {
      notificationService.trigger({
        event: DB_NOTICE_TYPE.circle_invitation,
        actorId: viewer.id,
        recipientId: recipient.id,
        entities: [
          {
            type: 'target',
            entityTable: 'circle',
            entity: circle,
          },
        ],
      })
    }

    // send email to invitee
    if (recipient?.email || email) {
      notificationService.mail.sendCircleInvitation({
        code,
        circle: {
          displayName: circle.displayName,
          freePeriod: circle.freePeriod,
          name: circle.name,
        },
        language: recipient?.language,
        recipient: {
          displayName: recipient?.displayName,
        },
        redirectUrl,
        sender: {
          displayName: viewer.displayName,
        },
        to: recipient?.email || email,
      })
    }
  }

  return invitations
}

export default resolver
