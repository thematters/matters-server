import _find from 'lodash/find'
import _isNil from 'lodash/isNil'

import { isTarget } from 'common/utils'
import { TopicToCoverResolver } from 'definitions'

const resolver: TopicToCoverResolver = async (
  { cover },
  _,
  { dataSources: { systemService }, req, viewer }
) => {
  if (!cover) {
    return null
  }
  return systemService.findAssetUrl(cover, !isTarget(req, viewer))
}

export default resolver
