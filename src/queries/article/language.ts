import { ArticleToLanguageResolver } from 'definitions'

const resolver: ArticleToLanguageResolver = (
  { content },
  _,
  { dataSources: { articleService } }
) => articleService.detectLanguage(content)

export default resolver
