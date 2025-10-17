import type { GQLCommentResolvers } from '#definitions/index.js'

export const spamStatus: GQLCommentResolvers['spamStatus'] = async (
  { id, content, spamScore, isSpam },
  _,
  { dataSources: { commentService } }
) => {
  if (!spamScore) {
    commentService.detectSpam({ id, content: content ?? '' })
  }
  return { score: spamScore, isSpam }
}
