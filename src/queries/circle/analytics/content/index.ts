import { GQLCircleContentAnalyticsTypeResolver } from 'definitions/schema'

import conetntPaywall from './paywall.js'
import contentPublic from './public.js'

const resolvers: GQLCircleContentAnalyticsTypeResolver = {
  paywall: conetntPaywall,
  public: contentPublic,
}

export default resolvers
