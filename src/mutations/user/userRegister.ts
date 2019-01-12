import { MutationToUserRegisterResolver } from 'definitions'

const resolver: MutationToUserRegisterResolver = async (
  root,
  { input },
  { dataSources: { userService } }
) => {
  // check verification code
  const [code] = await userService.findVerificationCodes({
    where: { uuid: input.codeId, email: input.email, status: 'verified' }
  })
  if (!code) {
    throw new Error('code does not exists')
  }

  // TODO: check email
  // TODO: check username

  try {
    await userService.create(input)
    return userService.login(input)
  } catch (err) {
    throw err
  }
}

export default resolver
