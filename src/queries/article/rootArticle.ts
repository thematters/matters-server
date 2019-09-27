import { BLOCK_USERS } from 'common/enums'
import { QueryToArticleResolver } from 'definitions'

const resolver: QueryToArticleResolver = async (
  root,
  { input: { mediaHash, uuid } },
  { viewer, dataSources: { articleService, userService } }
) => {
  if (!mediaHash && !uuid) {
    return
  }

  let article
  if (mediaHash) {
    article = await articleService.findByMediaHash(mediaHash)
  } else if (uuid) {
    article = await articleService.baseFindByUUID(uuid)
  }

  if (article) {
    const user = await userService.dataloader.load(article.authorId)
    if (user && BLOCK_USERS.includes(user.userName)) {
      return
    }
  }
  return article
}

export default resolver
