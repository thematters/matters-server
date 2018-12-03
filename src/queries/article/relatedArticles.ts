import { Resolver } from 'src/definitions'

const resolver: Resolver = (
  { relatedArticleUUIDs },
  _,
  { articleService }
) => []

export default resolver
