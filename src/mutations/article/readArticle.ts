import { environment } from 'common/environment'
import { ArticleNotFoundError } from 'common/errors'
import logger from 'common/logger'
import { fromGlobalId } from 'common/utils'
import { MutationToReadArticleResolver } from 'definitions'

const resolver: MutationToReadArticleResolver = async (
  root,
  { input: { id } },
  { viewer, dataSources: { articleService, userService } }
) => {
  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.dataloader.load(dbId)
  if (!article) {
    throw new ArticleNotFoundError('target article does not exists')
  }

  await articleService.read({
    articleId: article.id,
    userId: viewer.id,
    ip: viewer.ip
  })

  // call like.co count api for like.co analytic pageview
  try {
    let liker
    if (viewer.id) {
      liker = await userService.findLiker({ userId: viewer.id })
    }
    const author = await userService.dataloader.load(article.authorId)
    await userService.likecoin.count({
      authorLikerId: author.likerId,
      liker: liker || undefined,
      likerIp: viewer.ip,
      url: `${environment.siteDomain}/@${author.userName}/${article.slug}-${article.mediaHash}`
    })
  } catch (error) {
    logger.error(error)
  }

  return article
}

export default resolver
