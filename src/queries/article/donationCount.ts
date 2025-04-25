import type { GQLArticleResolvers } from '#definitions/index.js'

import { TRANSACTION_PURPOSE } from '#common/enums/index.js'

const resolver: GQLArticleResolvers['donationCount'] = async (
  { id },
  _,
  { dataSources: { articleService } }
) =>
  articleService.countTransactions({
    purpose: TRANSACTION_PURPOSE.donation,
    targetId: id,
  })

export default resolver
