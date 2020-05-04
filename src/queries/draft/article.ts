import { connectionFromArray, connectionFromPromisedArray } from 'common/utils'
import { DraftToArticleResolver } from 'definitions'

const resolver: DraftToArticleResolver = (
  { id },
  _,
  { dataSources: { articleService } }
) => {
  return articleService.findByDraftId(id)
}

export default resolver
