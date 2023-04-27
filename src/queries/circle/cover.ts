import { isTarget } from 'common/utils'
import { CircleToCoverResolver } from 'definitions'

const resolver: CircleToCoverResolver = async (
  { cover },
  _,
  { dataSources: { systemService }, req, viewer }
) => {
  return cover
    ? systemService.findAssetUrl(cover, !isTarget(req, viewer))
    : null
}

export default resolver
