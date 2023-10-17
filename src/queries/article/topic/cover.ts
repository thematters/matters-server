import type { GQLTopicResolvers } from 'definitions'

import _find from 'lodash/find'
import _isNil from 'lodash/isNil'

const resolver: GQLTopicResolvers['cover'] = async (
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
