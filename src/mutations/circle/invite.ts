import { invalidateFQC } from '@matters/apollo-response-cache'

import {
  CIRCLE_INVITATION_VERIFICATION_CODE_EXPIRED_AFTER,
  CIRCLE_STATE,
  DB_NOTICE_TYPE,
  INVITATION_STATE,
  NODE_TYPES,
  USER_STATE,
} from 'common/enums'
import {
  AuthenticationError,
  EntityNotFoundError,
  ForbiddenByStateError,
  ForbiddenError,
  UserInputError,
} from 'common/errors'
import {
  fromGlobalId,
  generateRegisterRedirectUrl,
  makeUserName,
} from 'common/utils'
import { redis } from 'connectors'
import { GQLVerificationCodeType, MutationToInviteResolver } from 'definitions'

const VALID_INVITATION_DAYS = [30, 90, 180, 360]

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

  // check viewer state
  if (
    [USER_STATE.archived, USER_STATE.banned, USER_STATE.frozen].includes(
      viewer.state
    )
  ) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  // check inputs
  if (!invitees || invitees.length === 0) {
    throw new UserInputError('invitees are required')
  }

  if (!VALID_INVITATION_DAYS.includes(freePeriod)) {
    throw new UserInputError(
      `free period is invalid, should be one of [${VALID_INVITATION_DAYS.join(
        ', '
      )}]`
    )
  }
  const durationInDays = freePeriod

  // check circle
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

  // create invitations
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
        continue
      }
    }

    // skip if user is member already
    const recipientId = email
      ? (
          await atomService.findFirst({
            table: 'user',
            where: { email },
            whereIn: ['state', [USER_STATE.onboarding, USER_STATE.active]],
          })
        )?.id
      : userId

    if (recipientId) {
      const isMember = await paymentService.isCircleMember({
        circleId: circle.id,
        userId: recipientId,
      })

      if (isMember || recipientId === viewer.id) {
        continue
      }
    }

    let invitation = await atomService.findFirst({
      table: 'circle_invitation',
      where: {
        state: INVITATION_STATE.pending,
        circleId: circle.id,
        email,
        userId,
      },
    })

    // if not existed, create one
    if (!invitation) {
      invitation = await atomService.create({
        table: 'circle_invitation',
        data: {
          state: INVITATION_STATE.pending,
          circleId: circle.id,
          email,
          inviter: viewer.id,
          userId,
          durationInDays,
        },
      })
    }
    // if existed, then update sentAt
    else {
      const isFreePeriodChanged = invitation.durationInDays !== durationInDays

      invitation = await atomService.update({
        table: 'circle_invitation',
        where: { circleId: circle.id, email, userId },
        data: {
          sentAt: new Date(),
          ...(isFreePeriodChanged ? { durationInDays } : {}),
        },
      })
    }

    invitations.push(invitation)
  }

  // send notifications
  for (const invitation of invitations) {
    let codeObject
    let redirectUrl
    const { email, userId } = invitation

    const recipient = await atomService.findFirst({
      table: 'user',
      where: {
        ...(userId ? { id: userId } : { email }),
      },
      whereIn: ['state', [USER_STATE.onboarding, USER_STATE.active]],
    })

    // if user not found by id and email, then generate code
    if (!recipient && email) {
      codeObject = await userService.createVerificationCode({
        email,
        type: GQLVerificationCodeType.register,
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
        entities: [{ type: 'target', entityTable: 'circle', entity: circle }],
      })
    }

    // send email to invitee
    if (recipient?.email || email) {
      notificationService.mail.sendCircleInvitation({
        code: codeObject?.code,
        circle: {
          displayName: circle.displayName,
          freePeriod,
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

  // invalidate cache
  if (invitations && invitations.length > 0) {
    invalidateFQC({
      node: { type: NODE_TYPES.Circle, id: circle.id },
      redis,
    })
  }

  return invitations
}

export default resolver
