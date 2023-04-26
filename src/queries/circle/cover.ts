import { CircleToCoverResolver } from 'definitions'

const resolver: CircleToCoverResolver = async (
  { cover },
  _,
  { dataSources: { systemService }, req }
) => {
  const useS3 = ![
    'https://web-develop.matters.town',
    'https://web-next.matters.town',
  ].includes(req.headers.origin as string)
  return cover ? systemService.findAssetUrl(cover, useS3) : null
}

export default resolver
