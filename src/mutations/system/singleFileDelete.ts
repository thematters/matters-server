import { ForbiddenError } from 'common/errors'
import { MutationToSingleFileDeleteResolver } from 'definitions'

const resolver: MutationToSingleFileDeleteResolver = async (
  root,
  { input: { id } },
  { viewer, dataSources: { systemService } }
) => {
  const asset = await systemService.baseFindById(id, 'asset')

  if (viewer.id !== asset.authorId) {
    throw new ForbiddenError('only author can delete file')
  }

  await systemService.aws.baseDeleteFile(asset.path)
  await systemService.baseDelete(asset.id, 'asset')

  return true
}

export default resolver
