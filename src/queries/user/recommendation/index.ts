import { GQLRecommendationTypeResolver } from 'definitions/schema'

import { authors } from './authors'
import { followeeArticles } from './followeeArticles'
import { followeeWorks } from './followeeWorks'
import { hottest } from './hottest'
import { icymi } from './icymi'
import { newest } from './newest'
import { recommendArticles } from './recommendArticles'
import { tags } from './tags'
import { topics } from './topics'
import { valued } from './valued'
import { interest } from './interest'

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
