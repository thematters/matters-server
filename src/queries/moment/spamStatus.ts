import type { GQLMomentResolvers } from '#definitions/index.js'

export const spamStatus: GQLMomentResolvers['spamStatus'] = async ({
  spamScore,
  isSpam,
}) => {
  return { score: spamScore, isSpam }
}
