import type { GQLCommentResolvers } from '#definitions/index.js'

export const spamStatus: GQLCommentResolvers['spamStatus'] = async ({
  spamScore,
  isSpam,
}) => {
  return { score: spamScore, isSpam }
}
