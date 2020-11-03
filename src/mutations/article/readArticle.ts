import slugify from '@matters/slugify'

import { environment } from 'common/environment'
import { ArticleNotFoundError } from 'common/errors'
import logger from 'common/logger'
import { fromGlobalId } from 'common/utils'
import { likeCoinQueue } from 'connectors/queue'
import { MutationToReadArticleResolver } from 'definitions'

const resolver: MutationToReadArticleResolver = async (
  root,
  { input: { id } },
  { viewer, dataSources: { articleService, draftService, userService } }
) => {
  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.baseFindById(dbId)
  if (!article) {
    throw new ArticleNotFoundError('target article does not exists')
  }
  const node = await draftService.baseFindById(article.draftId)
  if (!node) {
    throw new ArticleNotFoundError(
      'target article linked draft does not exists'
    )
  }

  // only record if viewer read others articles
  if (viewer.id !== article.authorId) {
    const { newRead } = await articleService.read({
      articleId: article.id,
      userId: viewer.id || null,
      ip: viewer.ip,
    })

    // if it's a new read
    // call like.co count api for like.co analytic pageview
    if (newRead) {
      try {
        let liker
        if (viewer.id) {
          liker = await userService.findLiker({ userId: viewer.id })
        }

        const author = await userService.dataloader.load(article.authorId)
        const slug = slugify(node.title)

        likeCoinQueue.sendPV({
          likerId: liker ? liker.likerId : undefined,
          likerIp: viewer.ip,
          userAgent: viewer.userAgent,
          authorLikerId: author.likerId,
          url: `${environment.siteDomain}/@${author.userName}/${slug}-${node.mediaHash}`,
        })
      } catch (error) {
        logger.error(error)
      }
    }
  }

  return node
}

export default resolver
