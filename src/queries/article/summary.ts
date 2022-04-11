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
  const { summary, content: cont } = parent
  const accessType = await accessTypeResolver(parent, args, context, info)

  if (accessType === ARTICLE_ACCESS_TYPE.paywall) {
    return summary || ''
  }

  return summary || makeSummary(cont)
}

export default resolver
