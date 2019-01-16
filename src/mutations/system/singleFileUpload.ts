import { v4 } from 'uuid'
import { AuthenticationError } from 'apollo-server'
import { ItemData, MutationToSingleFileUploadResolver } from 'definitions'

const resolver: MutationToSingleFileUploadResolver = async (
  root,
  { input: { type, file } },
  { viewer, dataSources: { systemService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const data = await file
  const { filename, mimetype, encoding } = data
  const key = await systemService.aws.baseUploadFile(type, data)
  const asset: ItemData = {
    uuid: v4(),
    authorId: viewer.id,
    type,
    path: key
  }
  const newAsset = await systemService.baseCreate(asset, 'asset')
  return {
    ...newAsset,
    path: `${systemService.aws.s3Endpoint}/${newAsset.path}`
  }
}

export default resolver
