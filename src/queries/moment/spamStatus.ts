import type { GQLMomentResolvers } from '#definitions/index.js'

export const spamStatus: GQLMomentResolvers['spamStatus'] = async (
  { id, content, spamScore, isSpam },
  _,
  { dataSources: { momentService } }
) => {
  if (!spamScore) {
    momentService.detectSpam({ id, content })
  }

  return { score: spamScore, isSpam }
}
