import { Resolver } from 'definitions'

const resolver: Resolver = async (
  _,
  { input: { path } },
  { viewer, userService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this')
  }
  await userService.aws.baseDeleteFile(path)

  return true
}
export default resolver
