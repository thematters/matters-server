// import slugify from '@matters/slugify'

import { ARTICLE_STATE } from 'common/enums'
// import { environment } from 'common/environment'
import { ArticleNotFoundError } from 'common/errors'
// import logger from 'common/logger'
import { fromGlobalId } from 'common/utils'
// import { likecoin } from 'connectors'
import { MutationToReadArticleResolver } from 'definitions'

const resolver: MutationToReadArticleResolver = async (
  root,
  { input: { id } },
  {
    viewer,
    dataSources: { atomService, articleService, draftService, userService },
  }
) => {
  const { id: dbId } = fromGlobalId(id)

  const article = await atomService.findFirst({
    table: 'article',
    where: { id: dbId, state: ARTICLE_STATE.active },
  })
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
    await articleService.read({
      articleId: article.id,
      userId: viewer.id || null,
      ip: viewer.ip,
    })

    // const { newRead } = await articleService.read({
    //   articleId: article.id,
    //   userId: viewer.id || null,
    //   ip: viewer.ip,
    // })

    // // if it's a new read
    // // call like.co count api for like.co analytic pageview
    // if (newRead) {
    //   try {
    //     let liker
    //     if (viewer.id) {
    //       liker = await userService.findLiker({ userId: viewer.id })
    //     }

    //     const author = await userService.dataloader.load(article.authorId)
    //     // const slug = slugify(node.title)

    //     likecoin.sendPV({
    //       likerId: liker ? liker.likerId : undefined,
    //       likerIp: viewer.ip,
    //       userAgent: viewer.userAgent,
    //       authorLikerId: author.likerId,
    //       url: `https://${environment.siteDomain}/@${author.userName}/${article.id}`,
    //     })
    //   } catch (error) {
    //     logger.error(error)
    //   }
    // }
  }

  return node
}

export default resolver
