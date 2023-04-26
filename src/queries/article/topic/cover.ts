import _find from 'lodash/find'
import _isNil from 'lodash/isNil'

import { TopicToCoverResolver } from 'definitions'

const resolver: TopicToCoverResolver = async (
  { cover },
  _,
  { dataSources: { systemService }, req }
) => {
  if (!cover) {
    return null
  }
  const useS3 = ![
    'https://web-develop.matters.town',
    'https://web-next.matters.town',
  ].includes(req.headers.origin as string)
  return systemService.findAssetUrl(cover, useS3)
}

export default resolver
