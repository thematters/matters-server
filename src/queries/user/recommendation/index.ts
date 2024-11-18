import { GQLRecommendationResolvers } from 'definitions'

import { authors } from './authors'
import following from './following'
import { hottest, hottestExcludeSpam } from './hottest'
import hottestCircles from './hottestCircles'
import { hottestTags } from './hottestTags'
import { icymi } from './icymi'
import { icymiTopic } from './icymiTopic'
import { newest, newestExcludeSpam } from './newest'
import newestCircles from './newestCircles'
import { selectedTags } from './selectedTags'
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
  hottestTags,
  selectedTags,
  hottestCircles,
  newestCircles,
}

export default resolvers
