import { MutationToSendVerificationCodeResolver } from 'definitions'
import { VERIFICATION_CODE_PROTECTED_TYPES } from 'common/enums'
import { notificationQueue } from 'connectors/queue'
import { environment } from 'common/environment'
import { AuthenticationError } from 'common/errors'

const resolver: MutationToSendVerificationCodeResolver = async (
  _,
  { input: { email, type } },
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id && VERIFICATION_CODE_PROTECTED_TYPES.includes(type)) {
    throw new AuthenticationError(
      `visitor cannot send verification code of ${type}`
    )
  }

  // insert record
  const { code } = await userService.createVerificationCode({
    userId: viewer.id,
    email,
    type
  })

  // TODO: send email
  notificationQueue.sendMail({
    from: environment.emailName as string,
    to: email,
    html: `Your verification code for ${type} is <strong>${code}</strong>`,
    subject: `${code}`
  })

  return true
}

export default resolver
