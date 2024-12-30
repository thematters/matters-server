import { GQLRecommendationResolvers } from 'definitions'

import { authors } from './authors'
import following from './following'
import { hottest, hottestExcludeSpam } from './hottest'
import { icymi } from './icymi'
import { icymiTopic } from './icymiTopic'
import { newest, newestExcludeSpam } from './newest'
import { tags } from './tags'

const resolvers: GQLRecommendationResolvers = {
  authors,
  following,
  hottest,
  hottestExcludeSpam,
  icymi,
  icymiTopic,
  newest,
  newestExcludeSpam,
  tags,
}

export default resolvers
