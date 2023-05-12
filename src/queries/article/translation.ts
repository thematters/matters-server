import { invalidateFQC } from '@matters/apollo-response-cache'
import { makeSummary } from '@matters/ipns-site-generator'

import { ARTICLE_ACCESS_TYPE, NODE_TYPES } from 'common/enums'
import { getLogger } from 'common/logger'
import { CacheService, gcp } from 'connectors'
import { ArticleToTranslationResolver } from 'definitions'

const logger = getLogger('query-translations')

const resolver: ArticleToTranslationResolver = async (
  {
    content: originContent,
    title: originTitle,
    summary: originSummary,
    articleId,
    authorId,
    language: storedLanguage,
  },
  { input },
  {
    viewer,
    dataSources: { atomService, articleService, paymentService, tagService },
  }
) => {
  const language = input && input.language ? input.language : viewer.language

  // paywalled content
  let isPaywalledContent = false
  const isAuthor = authorId === viewer.id
  const articleCircle = await articleService.findArticleCircle(articleId)
  if (
    !isAuthor &&
    articleCircle &&
    articleCircle.access === ARTICLE_ACCESS_TYPE.paywall
  ) {
    if (viewer.id) {
      const isCircleMember = await paymentService.isCircleMember({
        userId: viewer.id,
        circleId: articleCircle.circleId,
      })

      // not circle member
      if (!isCircleMember) {
        isPaywalledContent = true
      }
    } else {
      isPaywalledContent = true
    }
  }

  // it's same as original language
  if (language === storedLanguage) {
    return {
      content: isPaywalledContent ? '' : originContent,
      title: originTitle,
      summary: originSummary,
      language,
    }
  }

  // get translation
  const translation = await atomService.findFirst({
    table: 'article_translation',
    where: { articleId, language },
  })

  if (translation) {
    return {
      ...translation,
      content: isPaywalledContent ? '' : translation.content,
    }
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
        target: language,
      })
    )
  )

  if (title && content) {
    const data = { articleId, title, content, summary, language }
    await atomService.upsert({
      table: 'article_translation',
      where: { articleId, language },
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
              target: language,
            })
            const tagData = {
              tagId: tag.id,
              content: translatedTag,
              language,
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

    const cacheService = new CacheService()
    await invalidateFQC({
      node: { type: NODE_TYPES.Article, id: articleId },
      redis: cacheService.redis,
    })

    return {
      title,
      content: isPaywalledContent ? '' : content,
      summary,
      language,
    }
  } else {
    return null
  }
}
export default resolver
