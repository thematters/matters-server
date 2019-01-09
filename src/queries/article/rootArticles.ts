import { isNil } from 'lodash'

import { QueryToArticlesResolver } from 'definitions'

const resolver: QueryToArticlesResolver = async (
  root,
  { input: { public: isPublic, offset, limit } },
  { viewer, dataSources: { articleService } }
) => {
  if (!viewer.id) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  if (viewer.role !== 'admin') {
    throw new Error('only admin can do this') // TODO
  }

  let where
  if (!isNil(isPublic)) {
    where = { public: isPublic }
  }

  return articleService.find({
    where,
    offset,
    limit
  })
}

export default resolver
