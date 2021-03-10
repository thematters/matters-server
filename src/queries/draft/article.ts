import { DraftToArticleResolver } from 'definitions'

const resolver: DraftToArticleResolver = (
  { id },
  _,
  { dataSources: { articleService } }
) => {
  return articleService.findByDraftId(id)
}

export default resolver
