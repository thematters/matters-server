import { GQLRecommendationTypeResolver } from 'definitions/schema'

import { authors } from './authors'
import { followeeArticles } from './followeeArticles'
import { followeeComments } from './followeeComments'
import { followeeWorks } from './followeeWorks'
import { followTags } from './followTags'
import { followTagsArticles } from './followTagsArticles'
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
  followeeWorks,
  followTags,
  followTagsArticles,
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
