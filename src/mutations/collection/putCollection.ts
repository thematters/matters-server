import { ForbiddenError, ServerError, UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToPutCollectionResolver } from 'definitions'

const resolver: MutationToPutCollectionResolver = async (
  _,
  { input: { id, title, description, cover } },
  { dataSources: { collectionService }, viewer }
) => {
  if (!viewer.id) {
    throw new ForbiddenError('visitor has no permission')
  }

  if (title && title.length > 20) {
    throw new UserInputError('title is too long')
  }
  if (description && description.length > 140) {
    throw new UserInputError('description is too long')
  }

  // TODO: check cover

  if (id) {
    const { id: dbId } = fromGlobalId(id)
    return await collectionService.updateCollection(dbId, {
      title,
      description,
      cover,
    })
  } else {
    if (!title) {
      throw new ServerError('title is required')
    }
    return await collectionService.createCollection({
      authorId: viewer.id,
      title,
      description,
      cover,
    })
  }
}

export default resolver
