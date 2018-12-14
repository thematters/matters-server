import { Resolver } from 'definitions'

const resolver: Resolver = async (
  _,
  { input: { path } },
  { viewer, awsService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this')
  }
  await awsService.baseDeleteFile(path)

  return true
}
export default resolver
