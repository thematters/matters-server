import { UserInfoToProfileCoverResolver } from 'definitions'

const resolver: UserInfoToProfileCoverResolver = async (
  { profileCover },
  _,
  { dataSources: { systemService }, req }
) => {
  const useS3 = ![
    'https://web-develop.matters.town',
    'https://web-next.matters.town',
  ].includes(req.headers.origin as string)
  return profileCover ? systemService.findAssetUrl(profileCover, useS3) : null
}

export default resolver
