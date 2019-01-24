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
  { input: { email, type } },
  { viewer, dataSources: { userService, notificationService } }
) => {
  if (!viewer.id && VERIFICATION_CODE_PROTECTED_TYPES.includes(type)) {
    throw new AuthenticationError(
      `visitor cannot send verification code of ${type}`
    )
  }

  if (type === VERIFICATION_CODE_TYPES.register) {
    const user = await userService.findByEmail(email)
    if (user) {
      throw new EmailExistsError('email has been registered')
    }
  }

  if (type === VERIFICATION_CODE_TYPES.password_reset) {
    const user = await userService.findByEmail(email)
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
    code
  })

  return true
}

export default resolver
