import { ArticleToAppreciatorCountResolver } from 'definitions'

const resolver: ArticleToAppreciatorCountResolver = (
  { id },
  _,
  { viewer, dataSources: { articleService } }
) => articleService.countAppreciators(id)

export default resolver
