import type { GQLArticleResolvers } from 'definitions'

import { TRANSACTION_PURPOSE } from 'common/enums'

const resolver: GQLArticleResolvers['donationCount'] = async (
  { id, authorId },
  _,
  { dataSources: { articleService }, viewer }
) => {
  // only author can see donation count
  if (viewer?.id !== authorId) {
    return 0
  }
  return articleService.countTransactions({
    purpose: TRANSACTION_PURPOSE.donation,
    targetId: id,
  })
}

export default resolver
