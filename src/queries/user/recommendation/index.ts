import { GQLRecommendationTypeResolver } from 'definitions/schema'

import { authors } from './authors'
import { followeeArticles } from './followeeArticles'
import { followeeWorks } from './followeeWorks'
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
  followeeWorks,
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
