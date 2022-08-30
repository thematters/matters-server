import { makeSummary } from '@matters/matters-html-formatter'

import logger from 'common/logger'
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
  { viewer, dataSources: { atomService, articleService, tagService } }
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
      update: { ...data, updatedAt: atomService.knex.fn.now() },
    })

    // translate tags
    const tagIds = await articleService.findTagIds({ id: articleId })
    if (tagIds && tagIds.length > 0) {
      try {
        const tags = await tagService.dataloader.loadMany(tagIds)
        await Promise.all(
          tags.map(async (tag) => {
            if (tag instanceof Error) {
              return
            }
            const translatedTag = await gcp.translate({
              content: tag.content,
              target,
            })
            const tagData = {
              tagId: tag.id,
              content: translatedTag,
              language: target,
            }
            await atomService.upsert({
              table: 'tag_translation',
              where: { tagId: tag.id },
              create: tagData,
              update: { ...tagData, updatedAt: atomService.knex.fn.now() },
            })
          })
        )
      } catch (error) {
        logger.error(error)
      }
    }

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
