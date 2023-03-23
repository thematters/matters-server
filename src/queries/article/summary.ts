import { makeSummary } from '@matters/ipns-site-generator'

import { ARTICLE_ACCESS_TYPE } from 'common/enums/index.js'
import { ArticleToSummaryResolver } from 'definitions'

import { type as accessTypeResolver } from './access/type.js'

const resolver: ArticleToSummaryResolver = async (
  parent,
  args,
  context,
  info
) => {
  const { summary, content: cont, summaryCustomized } = parent
  const accessType = await accessTypeResolver(parent, args, context, info)

  if (accessType === ARTICLE_ACCESS_TYPE.paywall) {
    if (!summaryCustomized) {
      return '' // drop pre-computed summary if not summaryCustomized
    }
    return summary || ''
  }

  return summary || makeSummary(cont)
}

export default resolver
