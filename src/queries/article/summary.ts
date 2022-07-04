import { makeSummary } from '@matters/matters-html-formatter'

import { ARTICLE_ACCESS_TYPE } from 'common/enums'
import { ArticleToSummaryResolver } from 'definitions'

import { type as accessTypeResolver } from './access/type'

const resolver: ArticleToSummaryResolver = async (
  parent,
  args,
  context,
  info
) => {
  const { summary, content: cont, summaryCustomized } = parent
  const accessType = await accessTypeResolver(parent, args, context, info)

  // console.log(new Date(), 'in article summary:', { access, summary, cont, parent, args, })

  if (accessType === ARTICLE_ACCESS_TYPE.paywall) {
    if (!summaryCustomized) {
      return '' // drop pre-computed summary if not summaryCustomized
    }
    return summary || ''
  }

  return summary || makeSummary(cont)
}

export default resolver
