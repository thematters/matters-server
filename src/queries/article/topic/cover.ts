import _find from 'lodash/find'
import _isNil from 'lodash/isNil'

import { TopicToCoverResolver } from 'definitions'

const resolver: TopicToCoverResolver = async (
  { cover },
  _,
  { dataSources: { systemService } }
) => {
  if (!cover) {
    return null
  }

  return systemService.findAssetUrl(cover)
}

export default resolver
