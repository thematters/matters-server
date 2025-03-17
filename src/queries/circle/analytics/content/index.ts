import type { GQLCircleContentAnalyticsResolvers } from '#definitions/schema.js'

import conetntPaywall from './paywall.js'
import contentPublic from './public.js'

const resolvers: GQLCircleContentAnalyticsResolvers = {
  paywall: conetntPaywall,
  public: contentPublic,
}

export default resolvers
