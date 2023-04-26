import { DraftToCoverResolver } from 'definitions'

const resolver: DraftToCoverResolver = async (
  { cover, authorId },
  _,
  { viewer, dataSources: { systemService }, req }
) => {
  const isAdmin = viewer.hasRole('admin')
  const isAuthor = authorId === viewer.id

  if (isAdmin || isAuthor) {
    const useS3 = ![
      'https://web-develop.matters.town',
      'https://web-next.matters.town',
    ].includes(req.headers.origin as string)
    return cover ? systemService.findAssetUrl(cover, useS3) : null
  }

  return null
}

export default resolver
