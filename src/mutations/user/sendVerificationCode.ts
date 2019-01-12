import { MutationToSendVerificationCodeResolver } from 'definitions'
import { VERIFICATION_CODE_PROTECTED_TYPES } from 'common/enums'
import { notificationQueue } from 'connectors/queue'

const resolver: MutationToSendVerificationCodeResolver = async (
  _,
  { input: { email, type } },
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id && VERIFICATION_CODE_PROTECTED_TYPES.includes(type)) {
    throw new Error(`anonymous user cannot send verification code of ${type}`) // TODO
  }

  // if (viewer.email && ) {

  // }

  // insert record
  const { code } = await userService.createVerificationCode({
    userId: viewer.id,
    email,
    type
  })

  // send email
  console.log(code)
  // notificationQueue.sendMail()

  return true
}

export default resolver
