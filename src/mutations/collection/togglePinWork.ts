import type { MutationToTogglePinWorkResolver } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { AuthenticationError, UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToTogglePinWorkResolver = async (
  _,
  { input: { id: globalId, enabled } },
  { viewer, dataSources: { collectionService, articleService, draftService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }
  const { id, type } = fromGlobalId(globalId)
  if (type !== NODE_TYPES.Article && type !== NODE_TYPES.Collection) {
    throw new UserInputError('Invalid id')
  }

  if (type === NODE_TYPES.Article) {
    const article = await articleService.togglePin(id, viewer.id, enabled)
    console.log(article)
    const draft = await draftService.loadById(article.draftId)
    console.log(draft)
    return { ...draft, pinned: article.pinned, __type: NODE_TYPES.Article }
  } else {
    const collection = await collectionService.togglePin(id, viewer.id, enabled)
    return { ...collection, __type: NODE_TYPES.Collection }
  }
}

export default resolver
