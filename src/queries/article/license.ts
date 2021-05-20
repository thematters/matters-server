import { ARTICLE_LICENSE_TYPE } from 'common/enums'
import { ArticleToLicenseResolver } from 'definitions'

const resolver: ArticleToLicenseResolver = ({ license }, _) => {
  switch (license) {
    case ARTICLE_LICENSE_TYPE.arr:
      return 'ARR'
    case ARTICLE_LICENSE_TYPE.cc_0:
      return 'CC_0'
    case ARTICLE_LICENSE_TYPE.cc_by_nc_nd_2:
    default:
      return 'CC_BY_NC_ND_2'
  }
}

export default resolver
