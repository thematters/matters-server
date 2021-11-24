import { makeSummary } from '@matters/matters-html-formatter'

import { gcp } from 'connectors'
import { ArticleToTranslationResolver } from 'definitions'

const resolver: ArticleToTranslationResolver = async (
  { content: originContent, title: originTitle, summary: originSummary },
  { input },
  { viewer }
) => {
  const target = input && input.language ? input.language : viewer.language

  const [title, content, summary] = await Promise.all(
    [
      originTitle,
      originContent,
      originSummary || makeSummary(originContent),
    ].map((text) =>
      gcp.translate({
        content: text,
        target,
      })
    )
  )

  return title && content
    ? {
        title,
        content,
        summary,
      }
    : null
}
export default resolver
