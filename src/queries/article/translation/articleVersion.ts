import type { GQLArticleVersionResolvers } from '#definitions/index.js'

import { USER_ROLE } from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'

const resolver: GQLArticleVersionResolvers['translation'] = async (
  root,
  { input },
  { viewer, dataSources: { articleService } }
) => {
  const isAdmin = viewer.role === USER_ROLE.admin

  if (input?.model && !isAdmin) {
    throw new UserInputError('Not allowed to provide `model`')
  }

  const language = input && input.language ? input.language : viewer.language
  return articleService.getOrCreateTranslation(
    root,
    language,
    viewer.id,
    input?.model
  )
}

export default resolver
