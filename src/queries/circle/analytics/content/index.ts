import { GQLCircleContentAnalyticsTypeResolver } from 'definitions/schema'

import conetntPaywall from './paywall'
import contentPublic from './public'

const resolvers: GQLCircleContentAnalyticsTypeResolver = {
  paywall: conetntPaywall,
  public: contentPublic,
}

export default resolvers
