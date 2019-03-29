import { v4 } from 'uuid'

import { ItemData, MutationToSingleFileUploadResolver } from 'definitions'
import { AuthenticationError, UserInputError } from 'common/errors'

const resolver: MutationToSingleFileUploadResolver = async (
  root,
  { input: { type, file, url } },
  { viewer, dataSources: { systemService } }
) => {
  if (!file && !url) {
    throw new UserInputError(
      'Either file or url needs to be speficied for upload.'
    )
  }

  const key = await systemService.aws.baseUploadFile(type, file)
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
