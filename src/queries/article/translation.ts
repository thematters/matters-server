import { makeSummary } from '@matters/matters-html-formatter'

import { gcp } from 'connectors'
import { ArticleToTranslationResolver } from 'definitions'

const resolver: ArticleToTranslationResolver = async (
  {
    content: originContent,
    title: originTitle,
    summary: originSummary,
    articleId,
  },
  { input },
  { viewer, dataSources: { atomService } }
) => {
  const target = input && input.language ? input.language : viewer.language

  // get translation
  const translation = await atomService.findFirst({
    table: 'article_translation',
    where: { articleId },
  })

  if (translation) {
    return translation
  }

  // or translate and store to db
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

  if (title && content) {
    // create or update to db
    const data = {
      articleId,
      title,
      content,
      summary,
      language: target,
    }
    await atomService.upsert({
      table: 'article_translation',
      where: { articleId },
      create: data,
      update: { ...data, updatedAt: new Date() },
    })

    return {
      title,
      content,
      summary,
      language: target,
    }
  } else {
    return null
  }
}
export default resolver
