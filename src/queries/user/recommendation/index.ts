import { GQLRecommendationTypeResolver } from 'definitions/schema'

import { authors } from './authors'
import { followeeArticles } from './followeeArticles'
import { followeeComments } from './followeeComments'
import { followeeDonatedArticles } from './followeeDonatedArticles'
import { followeeWorks } from './followeeWorks'
import { followingTags } from './followingTags'
import { followingTagsArticles } from './followingTagsArticles'
import { hottest } from './hottest'
import { icymi } from './icymi'
import { interest } from './interest'
import { newest } from './newest'
import { recommendArticles } from './recommendArticles'
import { tags } from './tags'
import { topics } from './topics'
import { valued } from './valued'

const resolvers: GQLRecommendationTypeResolver = {
  authors,
  followeeArticles,
  followeeComments,
  followeeDonatedArticles,
  followeeWorks,
  followingTags,
  followingTagsArticles,
  hottest,
  icymi,
  newest,
  recommendArticles,
  tags,
  topics,
  valued,
  interest,
}

export default resolvers
