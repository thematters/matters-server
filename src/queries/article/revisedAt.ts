import { PUBLISH_STATE } from 'common/enums'
import { ArticleToLiveResolver } from 'definitions'

const resolver: ArticleToLiveResolver = async (
  { articleId },
  _,
  { dataSources: { draftService } }
) => {
  const drafts = await draftService.findPublishedByArticleId({ articleId })

  if (drafts.length <= 1) {
    return
  }
  return drafts[0].createdAt
}

export default resolver
