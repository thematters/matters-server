import { v4 } from 'uuid'
import { ItemData, Resolver } from 'definitions'

const resolver: Resolver = async (
  root,
  { input: { type, file } },
  { viewer, dataSources: { systemService } }
) => {
  if (!viewer.id) {
    throw new Error('anonymous user cannot do this')
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
