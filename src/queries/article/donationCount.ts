import type { GQLArticleResolvers } from 'definitions'

import { TRANSACTION_PURPOSE } from 'common/enums'

const resolver: GQLArticleResolvers['donationCount'] = async (
  { articleId },
  _,
  { dataSources: { articleService } }
) =>
  articleService.countTransactions({
    purpose: TRANSACTION_PURPOSE.donation,
    targetId: articleId,
  })

export default resolver
