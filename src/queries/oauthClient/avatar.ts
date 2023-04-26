import { OAuthClientToAvatarResolver } from 'definitions'

const resolver: OAuthClientToAvatarResolver = async (
  { avatar },
  _,
  { dataSources: { systemService }, req }
) => {
  const useS3 = ![
    'https://web-develop.matters.town',
    'https://web-next.matters.town',
  ].includes(req.headers.origin as string)
  return avatar ? systemService.findAssetUrl(avatar, useS3) : null
}

export default resolver
