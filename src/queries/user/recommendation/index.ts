import { GQLRecommendationTypeResolver } from 'definitions/schema'

import { authors } from './authors'
import { followeeArticles } from './followeeArticles'
import { followeeComments } from './followeeComments'
import { followeeDonatedArticles } from './followeeDonatedArticles'
import following from './following'
import { followingTagsArticles } from './followingTagsArticles'
import { hottest } from './hottest'
import hottestCircles from './hottestCircles'
import { hottestTags } from './hottestTags'
import { icymi } from './icymi'
import { newest } from './newest'
import newestCircles from './newestCircles'
import { selectedTags } from './selectedTags'
import { tags } from './tags'

const resolvers: GQLRecommendationTypeResolver = {
  authors,
  following,
  followeeArticles,
  followeeComments,
  followeeDonatedArticles,
  followingTagsArticles,
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
