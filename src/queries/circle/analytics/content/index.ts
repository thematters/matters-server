import type { GQLCircleContentAnalyticsResolvers } from 'definitions/schema'

import conetntPaywall from './paywall'
import contentPublic from './public'

const resolvers: GQLCircleContentAnalyticsResolvers = {
  paywall: conetntPaywall,
  public: contentPublic,
}

export default resolvers
