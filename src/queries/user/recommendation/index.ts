import { GQLRecommendationTypeResolver } from 'definitions/schema'

import { authors } from './authors'
import { followeeArticles } from './followeeArticles'
import { followeeComments } from './followeeComments'
import { followeeDonatedArticles } from './followeeDonatedArticles'
import { followingTagsArticles } from './followingTagsArticles'
import { hottest } from './hottest'
import hottestCircles from './hottestCircles'
import { hottestTags } from './hottestTags'
import { icymi } from './icymi'
import { interest } from './interest'
import { newest } from './newest'
import newestCircles from './newestCircles'
import { recommendArticles } from './recommendArticles'
import { selectedTags } from './selectedTags'
import { tags } from './tags'
import { topics } from './topics'
import { valued } from './valued'

const resolvers: GQLRecommendationTypeResolver = {
  authors,
  followeeArticles,
  followeeComments,
  followeeDonatedArticles,
  followingTagsArticles,
  hottest,
  icymi,
  newest,
  recommendArticles,
  tags,
  topics,
  valued,
  interest,
  hottestTags,
  selectedTags,
  hottestCircles,
  newestCircles,
}

export default resolvers
