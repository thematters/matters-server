import { GQLRecommendationResolvers } from 'definitions'

import { authors } from './authors'
import following from './following'
import { hottest } from './hottest'
import hottestCircles from './hottestCircles'
import { hottestTags } from './hottestTags'
import { icymi } from './icymi'
import { icymiTopic } from './icymiTopic'
import { newest } from './newest'
import newestCircles from './newestCircles'
import readTagsArticles from './readTagsArticles'
import { selectedTags } from './selectedTags'
import { tags } from './tags'

const resolvers: GQLRecommendationResolvers = {
  authors,
  following,
  readTagsArticles,
  hottest,
  icymi,
  icymiTopic,
  newest,
  tags,
  hottestTags,
  selectedTags,
  hottestCircles,
  newestCircles,
}

export default resolvers
