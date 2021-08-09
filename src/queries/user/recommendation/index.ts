import { GQLRecommendationTypeResolver } from 'definitions/schema'

import { authors } from './authors'
import following from './following'
import { hottest } from './hottest'
import hottestCircles from './hottestCircles'
import { hottestTags } from './hottestTags'
import { icymi } from './icymi'
import { newest } from './newest'
import newestCircles from './newestCircles'
import readTagsArticles from './readTagsArticles'
import { selectedTags } from './selectedTags'
import { tags } from './tags'

const resolvers: GQLRecommendationTypeResolver = {
  authors,
  following,
  readTagsArticles,
  hottest,
  icymi,
  newest,
  tags,
  hottestTags,
  selectedTags,
  hottestCircles,
  newestCircles,
}

export default resolvers
