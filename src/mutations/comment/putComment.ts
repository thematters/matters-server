import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  _,
  { input: { comment, id } },
  {
    viewer,
    dataSources: { commentService, articleService, notificationService }
  }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  const { content, quotation, articleId, parentId, mentions } = comment
  const data: any = {
    content,
    authorId: viewer.id
  }

  const { id: authorDbId } = fromGlobalId(articleId)
  const article = await articleService.dataloader.load(authorDbId)
  if (!article) {
    throw new Error('target article does not exists') // TODO
  }
  data.articleId = article.id

  if (parentId) {
    const { id: parentDbId } = fromGlobalId(parentId)
    const parentComment = await commentService.dataloader.load(parentDbId)
    if (!parentComment) {
      throw new Error('target parentComment does not exists') // TODO
    }
    data.parentCommentId = parentComment.id
  }

  if (mentions) {
    data.mentionedUserIds = mentions.map(
      (userId: string) => fromGlobalId(userId).id
    )
  }

  // Update
  let newComment
  if (id) {
    const { id: commentDbId } = fromGlobalId(id)
    newComment = await commentService.update({ id: commentDbId, ...data })
  }
  // Create
  else {
    newComment = await commentService.create(data)
  }

  // trigger notification
  notificationService.trigger({
    type: 'article_updated',
    article
  })

  return newComment
}

export default resolver
