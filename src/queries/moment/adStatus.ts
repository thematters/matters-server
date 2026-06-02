import type { GQLMomentResolvers } from '#definitions/index.js'

export const adStatus: GQLMomentResolvers['adStatus'] = async ({ isAd }) => {
  return { isAd }
}
