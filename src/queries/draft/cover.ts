import { DraftToCoverResolver } from 'definitions'

const resolver: DraftToCoverResolver = async (
  { cover, authorId },
  _,
  { viewer, dataSources: { systemService } }
) => {
  const isAdmin = viewer.hasRole('admin')
  const isAuthor = authorId === viewer.id

  if (isAdmin || isAuthor) {
    return cover ? systemService.findAssetUrl(cover) : null
  }

  return null
}

export default resolver
