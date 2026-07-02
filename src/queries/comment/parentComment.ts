import type { GQLCommentResolvers } from '#definitions/index.js'

const resolver: GQLCommentResolvers['parentComment'] = async (
  { parentCommentId },
  _,
  { viewer, dataSources: { atomService, commentService } }
) => {
  if (!parentCommentId) {
    return null
  }

  const comment = await atomService.commentIdLoader.load(parentCommentId)
  if (
    !viewer.hasRole('admin') &&
    (await commentService.isAuthorRestricted(comment))
  ) {
    return null
  }

  return comment
}

export default resolver
