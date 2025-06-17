import type { GQLMutationResolvers } from '#definitions/index.js'

import { UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['setSpamStatus'] = async (
  _,
  { input: { id: globalId, isSpam } },
  { dataSources: { atomService, articleService } }
) => {
  const id = fromGlobalId(globalId).id

  if (!id) {
    throw new UserInputError('id is invalid')
  }

  const article = await atomService.update({
    table: 'article',
    where: { id },
    data: { isSpam },
  })

  if (!isSpam) {
    await articleService.runPostProcessing(article, false)
  }

  return article
}

export default resolver
