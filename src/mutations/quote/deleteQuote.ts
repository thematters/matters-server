import type { GQLMutationResolvers } from '#definitions/index.js'

import { NODE_TYPES, QUOTE_STATE } from '#common/enums/index.js'
import {
  EntityNotFoundError,
  ForbiddenError,
  UserInputError,
} from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'

const resolver: GQLMutationResolvers['deleteQuote'] = async (
  _,
  { input: { id } },
  {
    viewer,
    dataSources: {
      atomService,
      connections: { redis },
    },
  }
) => {
  const { id: quoteDbId, type } = fromGlobalId(id)
  if (type !== 'Quote') {
    throw new UserInputError('invalid id')
  }
  const quote = await atomService.findFirst({
    table: 'quote',
    where: { id: quoteDbId },
  })
  if (!quote) {
    throw new EntityNotFoundError('quote does not exists')
  }

  // retraction is allowed for: the poster, the source article's author
  // (the quoted words are theirs), or admin. checked before any idempotent
  // shortcut so an unauthorized viewer can never probe a quote's existence
  const article = await atomService.articleIdLoader.load(quote.articleId)
  const isPoster = viewer.id === quote.userId
  const isArticleAuthor = viewer.id === article?.authorId
  if (!isPoster && !isArticleAuthor && !viewer.hasRole('admin')) {
    throw new ForbiddenError('viewer has no permission')
  }

  // idempotent: already retracted, nothing to do
  if (quote.state !== QUOTE_STATE.active) {
    return true
  }

  // soft delete: hidden, not erased
  await atomService.update({
    table: 'quote',
    where: { id: quote.id },
    data: { state: QUOTE_STATE.archived },
  })

  invalidateFQC({
    node: { id: quote.campaignId, type: NODE_TYPES.Campaign },
    redis,
  })

  return true
}

export default resolver
