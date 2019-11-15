import { MutationToSubscribeArticleResolver } from 'definitions'

import toggleSubscribeArticleResolver from './toggleSubscribeArticle'

const resolver: MutationToSubscribeArticleResolver = async (
  parent,
  { input: { id } },
  ...rest
) => {
  return toggleSubscribeArticleResolver(
    parent,
    { input: { id, enabled: true } },
    ...rest
  )
}

export default resolver
