import { APPRECIATION_TYPES, CACHE_KEYWORD, NODE_TYPES } from 'common/enums'
import { environment } from 'common/environment'
import {
  ActionLimitExceededError,
  ArticleNotFoundError,
  AuthenticationError,
  ForbiddenError,
} from 'common/errors'
import { fromGlobalId, isFeatureEnabled } from 'common/utils'
import { gcp } from 'connectors'
import { appreciationQueue } from 'connectors/queue'
import { MutationToAppreciateArticleResolver } from 'definitions'

const resolver: MutationToAppreciateArticleResolver = async (
  root,
  { input: { id, amount, token } },
  {
    viewer,
    dataSources: {
      userService,
      articleService,
      notificationService,
      systemService,
    },
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (!viewer.likerId) {
    throw new ForbiddenError('viewer has no liker id')
  }

  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.dataloader.load(dbId)
  if (!article) {
    throw new ArticleNotFoundError('target article does not exists')
  }

  if (article.authorId === viewer.id) {
    throw new ForbiddenError('cannot appreciate your own article')
  }

  const appreciateLeft = await articleService.appreciateLeftByUser({
    articleId: dbId,
    userId: viewer.id,
  })
  if (appreciateLeft <= 0) {
    throw new ActionLimitExceededError('too many appreciations')
  }

  // Check if amount exceeded limit. if yes, then use the left amount.
  const validAmount = Math.min(amount, appreciateLeft)

  const author = await userService.dataloader.load(article.authorId)
  if (!author.likerId) {
    throw new ForbiddenError('article author has no liker id')
  }

  // protect from scripting
  const feature = await systemService.getFeatureFlag('verify_appreciate')

  if (feature && isFeatureEnabled(feature.flag, viewer)) {
    const isHuman = await gcp.recaptcha({ token, ip: viewer.ip })
    if (!isHuman) {
      throw new ForbiddenError('appreciate via script is not allowed')
    }
  }

  // insert appreciation job
  appreciationQueue.appreciate({
    amount: validAmount,
    articleId: article.id,
    senderId: viewer.id,
  })

  return article
}

export default resolver
