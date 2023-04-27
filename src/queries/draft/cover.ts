import { isTarget } from 'common/utils'
import { DraftToCoverResolver } from 'definitions'

const resolver: DraftToCoverResolver = async (
  { cover, authorId },
  _,
  { dataSources: { systemService }, req, viewer }
) => {
  const isAdmin = viewer.hasRole('admin')
  const isAuthor = authorId === viewer.id

  if (isAdmin || isAuthor) {
    return cover
      ? systemService.findAssetUrl(cover, !isTarget(req, viewer))
      : null
  }

  return null
}

export default resolver
