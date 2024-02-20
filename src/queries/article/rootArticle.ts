import type { GQLQueryResolvers } from 'definitions'

import { UserInputError } from 'common/errors'

const resolver: GQLQueryResolvers['article'] = async (
  _,
  { input: { mediaHash, shortHash } },
  { dataSources: { articleService, atomService } }
) => {
  if (!mediaHash && !shortHash) {
    throw new UserInputError('one of mediaHash or shortHash is required')
  }
  const articleId = mediaHash
    ? (await articleService.findVersionByMediaHash(mediaHash))?.articleId // if mediaHash
    : shortHash
    ? (await articleService.findArticleByShortHash(shortHash))?.id
    : '' // never

  return atomService.articleIdLoader.load(articleId)
}

export default resolver
