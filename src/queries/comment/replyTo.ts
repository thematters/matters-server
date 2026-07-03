import type { GQLCommentResolvers } from '#definitions/index.js'

const resolver: GQLCommentResolvers['replyTo'] = async (
  { replyTo },
  _,
  { viewer, dataSources: { atomService, commentService } }
) => {
  if (!replyTo) {
    return null
  }

  const comment = await atomService.commentIdLoader.load(replyTo)
  if (
    !viewer.hasRole('admin') &&
    (await commentService.isAuthorRestricted(comment))
  ) {
    return null
  }

  return comment
}

export default resolver
