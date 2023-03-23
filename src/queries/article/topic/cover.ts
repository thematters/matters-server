import _find from 'lodash/find.js'
import _isNil from 'lodash/isNil.js'

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
