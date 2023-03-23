import {
  AUTO_FOLLOW_TAGS,
  CIRCLE_STATE,
  DB_NOTICE_TYPE,
  INVITATION_STATE,
  VERIFICATION_CODE_STATUS,
} from 'common/enums/index.js'
import { environment } from 'common/environment.js'
import {
  CodeExpiredError,
  CodeInactiveError,
  CodeInvalidError,
  DisplayNameInvalidError,
  EmailExistsError,
  EmailInvalidError,
  NameExistsError,
  NameInvalidError,
  PasswordInvalidError,
} from 'common/errors.js'
import {
  getViewerFromUser,
  isValidDisplayName,
  isValidEmail,
  isValidPassword,
  isValidUserName,
  setCookie,
} from 'common/utils/index.js'
import {
  AuthMode,
  GQLAuthResultType,
  GQLVerificationCodeType,
  MutationToUserRegisterResolver,
} from 'definitions'

const resolver: MutationToUserRegisterResolver = async (
  root,
  { input },
  context
) => {
  const {
    viewer,
    dataSources: { atomService, tagService, userService, notificationService },
    req,
    res,
  } = context
  const { email: rawEmail, userName, displayName, password, codeId } = input
  const email = rawEmail.toLowerCase()
  if (!isValidEmail(email, { allowPlusSign: false })) {
    throw new EmailInvalidError('invalid email address format')
  }

  // check verification code
  const codes = await userService.findVerificationCodes({
    where: {
      uuid: codeId,
      email,
      type: GQLVerificationCodeType.register,
    },
  })
  const code = codes?.length > 0 ? codes[0] : {}

  // check code
  if (code.status === VERIFICATION_CODE_STATUS.expired) {
    throw new CodeExpiredError('code is expired')
  }
  if (code.status === VERIFICATION_CODE_STATUS.inactive) {
    throw new CodeInactiveError('code is retired')
  }
  if (code.status !== VERIFICATION_CODE_STATUS.verified) {
    throw new CodeInvalidError('code does not exists')
  }

  // check email
  const otherUser = await userService.findByEmail(email)
  if (otherUser) {
    throw new EmailExistsError('email address has already been registered')
  }

  // check display name
  // Note: We will use "userName" to pre-fill "displayName" in step-1 of signUp flow on website
  const shouldCheckDisplayName = displayName !== userName
  if (shouldCheckDisplayName && !isValidDisplayName(displayName)) {
    throw new DisplayNameInvalidError('invalid user display name')
  }

  // check password
  if (!isValidPassword(password)) {
    throw new PasswordInvalidError('invalid user password')
  }

  let newUserName
  if (userName) {
    if (!isValidUserName(userName)) {
      throw new NameInvalidError('invalid user name')
    }

    if (await userService.checkUserNameExists(userName)) {
      throw new NameExistsError('user name already exists')
    }

    newUserName = userName
  } else {
    newUserName = await userService.generateUserName(email)
  }

  const newUser = await userService.create({
    ...input,
    email,
    userName: newUserName,
  })

  // auto follow matty
  await userService.follow(newUser.id, environment.mattyId)

  // auto follow tags
  await tagService.followTags(newUser.id, AUTO_FOLLOW_TAGS)

  // mark code status as used
  await userService.markVerificationCodeAs({
    codeId: code.id,
    status: VERIFICATION_CODE_STATUS.used,
  })

  // send email
  notificationService.mail.sendRegisterSuccess({
    to: email,
    recipient: {
      displayName,
    },
    language: viewer.language,
  })

  // send circle invitations' notices if user is invited
  const invitations = await atomService.findMany({
    table: 'circle_invitation',
    where: { email, state: INVITATION_STATE.pending },
  })
  await Promise.all(
    invitations.map(async (invitation) => {
      const circle = await atomService.findFirst({
        table: 'circle',
        where: {
          id: invitation.circleId,
          state: CIRCLE_STATE.active,
        },
      })
      notificationService.trigger({
        event: DB_NOTICE_TYPE.circle_invitation,
        actorId: invitation.inviter,
        recipientId: newUser.id,
        entities: [{ type: 'target', entityTable: 'circle', entity: circle }],
      })
    })
  )

  const { token, user } = await userService.loginByEmail({ ...input, email })

  setCookie({ req, res, token, user })

  context.viewer = await getViewerFromUser(user)
  context.viewer.authMode = user.role as AuthMode
  context.viewer.scope = {}

  return {
    token,
    auth: true,
    type: GQLAuthResultType.Signup,
    user,
  }
}

export default resolver
