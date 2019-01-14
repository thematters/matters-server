import { MutationToUserRegisterResolver } from 'definitions'

const resolver: MutationToUserRegisterResolver = async (
  root,
  { input },
  { dataSources: { userService } }
) => {
  // check verification code
  const [code] = await userService.findVerificationCodes({
    where: {
      uuid: input.codeId,
      email: input.email,
      type: 'register',
      status: 'verified'
    }
  })
  if (!code) {
    throw new Error('code does not exists')
  }

  // check email
  const user = await userService.findByEmail(input.email)
  if (user) {
    throw new Error('email address has already been registered')
  }

  // TODO: check username

  await userService.create(input)

  // mark code status as used
  await userService.markVerificationCodeAs({
    codeId: code.id,
    status: 'used'
  })

  return userService.login(input)
}

export default resolver
