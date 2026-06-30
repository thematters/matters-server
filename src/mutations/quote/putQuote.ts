import type { GQLMutationResolvers } from '#definitions/index.js'

import {
  ARTICLE_LICENSE_TYPE,
  ARTICLE_STATE,
  MAX_QUOTE_LENGTH,
  NODE_TYPES,
  QUOTE_STATE,
  USER_STATE,
} from '#common/enums/index.js'
import {
  ArticleNotFoundError,
  ForbiddenByStateError,
  ForbiddenError,
  UserInputError,
} from '#common/errors.js'
import { fromGlobalId, stripHtml } from '#common/utils/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'

// collapse whitespace so "selected text" can be matched against the
// article content regardless of line breaks / indentation
const normalize = (text: string) => text.replace(/\s+/g, '')

const resolver: GQLMutationResolvers['putQuote'] = async (
  _,
  { input: { articleId, content } },
  {
    viewer,
    dataSources: {
      atomService,
      articleService,
      connections: { redis },
    },
  }
) => {
  if (!viewer.userName) {
    throw new ForbiddenError('user has no username')
  }
  if (
    [USER_STATE.banned, USER_STATE.archived, USER_STATE.frozen].includes(
      viewer.state
    )
  ) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  // content: required, plain text, capped at MAX_QUOTE_LENGTH
  const quoteText = stripHtml(content).trim()
  if (quoteText.length <= 0) {
    throw new UserInputError('"content" is required')
  }
  if (quoteText.length > MAX_QUOTE_LENGTH) {
    throw new UserInputError(
      `quote can not be longer than ${MAX_QUOTE_LENGTH} characters`
    )
  }

  // target article
  const { id: articleDbId, type } = fromGlobalId(articleId)
  if (type !== 'Article') {
    throw new UserInputError('invalid id')
  }
  const article = await atomService.findFirst({
    table: 'article',
    where: { id: articleDbId, state: ARTICLE_STATE.active },
  })
  if (!article) {
    throw new ArticleNotFoundError('target article does not exists')
  }

  // license gate: ARR (all rights reserved) -> only the author may quote
  const isAuthor = viewer.id === article.authorId
  const articleVersion = await articleService.loadLatestArticleVersion(
    article.id
  )
  if (articleVersion.license === ARTICLE_LICENSE_TYPE.arr && !isAuthor) {
    throw new ForbiddenError(
      'only the author can quote an all-rights-reserved article'
    )
  }

  // the quote must be selected from the article content, not free-typed;
  // this is the primary anti-abuse mechanism
  const articleContent = await articleService.loadLatestArticleContent(
    article.id
  )
  if (!normalize(stripHtml(articleContent)).includes(normalize(quoteText))) {
    throw new UserInputError('quote must be an excerpt of the article')
  }

  // wall is campaign-scoped: the article must belong to a campaign
  const campaignArticle = await atomService.findFirst({
    table: 'campaign_article',
    where: { articleId: article.id, deleted: false },
    orderBy: [{ column: 'createdAt', order: 'desc' }],
  })
  if (!campaignArticle) {
    throw new UserInputError('only campaign articles can be quoted onto wall')
  }
  const campaignId = campaignArticle.campaignId

  // the quote wall is opt-in per campaign (e.g. 七日書): the campaign must have
  // it enabled. this is the authoritative gate — the client also hides the
  // post-to-wall affordance, but the server is the source of truth.
  const campaign = await atomService.findUnique({
    table: 'campaign',
    where: { id: campaignId },
  })
  if (!campaign?.enableQuoteWall) {
    throw new UserInputError('this campaign does not have a quote wall')
  }

  // dedupe: same user + same article + identical content
  const duplicated = await atomService.findFirst({
    table: 'quote',
    where: {
      userId: viewer.id,
      articleId: article.id,
      content: quoteText,
      state: QUOTE_STATE.active,
    },
  })
  if (duplicated) {
    throw new UserInputError('this quote is already on the wall')
  }

  // no quantity caps: per-article and daily limits removed, so users may post
  // any number of quotes; the content rules and dedup above still apply

  let quote
  try {
    quote = await atomService.create({
      table: 'quote',
      data: {
        content: quoteText,
        articleId: article.id,
        campaignId,
        userId: viewer.id,
        state: QUOTE_STATE.active,
      },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    // duplicate key error
    if (
      err.code === '23505' &&
      err.constraint === 'quote_user_id_article_id_content_unique'
    ) {
      throw new UserInputError('this quote is already on the wall')
    }
    throw err
  }

  invalidateFQC({
    node: { id: campaignId, type: NODE_TYPES.Campaign },
    redis,
  })

  return quote
}

export default resolver
