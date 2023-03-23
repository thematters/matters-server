import { GQLRecommendationTypeResolver } from 'definitions/schema'

import { authors } from './authors.js'
import following from './following/index.js'
import { hottest } from './hottest.js'
import hottestCircles from './hottestCircles.js'
import { hottestTags } from './hottestTags.js'
import { icymi } from './icymi.js'
import { newest } from './newest.js'
import newestCircles from './newestCircles.js'
import readTagsArticles from './readTagsArticles.js'
import { selectedTags } from './selectedTags.js'
import { tags } from './tags.js'

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
