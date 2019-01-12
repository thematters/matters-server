import { MutationToVerifyEmailResolver } from 'definitions'

const resolver: MutationToVerifyEmailResolver = async (
  _,
  { input: { codeId: uuid } },
  { viewer, dataSources: { userService } }
) => {
  const [code] = await userService.findVerificationCodes({
    where: { uuid, status: 'verified' }
  })

  // check code
  if (!code) {
    throw new Error('code does not exists')
  }

  // check email
  const user = await userService.findByEmail(code.email)
  if (!user) {
    throw new Error('target user does not exists')
  }

  // change password
  await userService.update(user.id, { emailVerified: true })

  // mark code status as used
  await userService.markVerificationCodeAs({
    codeId: code.id,
    status: 'used'
  })

  return true
}

export default resolver
