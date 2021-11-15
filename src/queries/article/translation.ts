import { makeSummary } from '@matters/matters-html-formatter'

import { gcp } from 'connectors'
import { ArticleToTranslationResolver } from 'definitions'

const resolver: ArticleToTranslationResolver = async (
  { content: originContent, title: originTitle, summary: originSummary },
  { input },
  { viewer }
) => {
  const target = input && input.language ? input.language : viewer.language

  const [title, content, summary] = await Promise.all([
    gcp.translate({
      content: originTitle,
      target,
    }),
    gcp.translate({
      content: originContent,
      target,
    }),
    gcp.translate({
      content: originSummary || makeSummary(originContent),
      target,
    }),
  ])

  return title && content
    ? {
        title,
        content,
        summary,
      }
    : null
}
export default resolver
