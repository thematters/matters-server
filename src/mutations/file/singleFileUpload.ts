import { Resolver } from 'definitions'

const resolver: Resolver = async (
  root,
  { input: { purpose, file } },
  { viewer, userService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this')
  }
  const data = await file
  const { filename, mimetype, encoding } = data
  const path = await userService.aws.baseUploadFile(purpose, data)
  return { filename, mimetype, encoding, path }
}

export default resolver
