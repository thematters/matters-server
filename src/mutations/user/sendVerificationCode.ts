import { MutationToSendVerificationCodeResolver } from 'definitions'
import {
  VERIFICATION_CODE_PROTECTED_TYPES,
  VERIFICATION_CODE_TYPES
} from 'common/enums'
import {
  AuthenticationError,
  EmailExistsError,
  EmailNotFoundError
} from 'common/errors'

const resolver: MutationToSendVerificationCodeResolver = async (
  _,
  { input: { email: rawEmail, type } },
  { viewer, dataSources: { userService, notificationService } }
) => {
  const email = rawEmail ? rawEmail.toLowerCase() : null

  if (!viewer.id && VERIFICATION_CODE_PROTECTED_TYPES.includes(type)) {
    throw new AuthenticationError(
      `visitor cannot send verification code of ${type}`
    )
  }

  let user
  if (type === VERIFICATION_CODE_TYPES.register) {
    user = await userService.findByEmail(email)
    if (user) {
      throw new EmailExistsError('email has been registered')
    }
  }

  if (
    type === VERIFICATION_CODE_TYPES.password_reset ||
    type === VERIFICATION_CODE_TYPES.email_reset
  ) {
    user = await userService.findByEmail(email)
    if (!user) {
      throw new EmailNotFoundError('cannot find email')
    }
  }

  // insert record
  const { code } = await userService.createVerificationCode({
    userId: viewer.id,
    email,
    type
  })

  // send verification email
  notificationService.mail.sendVerificationCode({
    to: email,
    type,
    code,
    recipient: {
      displayName: user && user.displayName
    },
    language: viewer.language
  })

  return true
}

export default resolver
