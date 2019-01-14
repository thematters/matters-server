import { isNil } from 'lodash'
import { connectionFromPromisedArray } from 'graphql-relay'

import { OSSToArticlesResolver } from 'definitions'

export const articles: OSSToArticlesResolver = async (
  root,
  { input: { public: isPublic, ...connectionArgs } },
  { viewer, dataSources: { articleService } }
) => {
  let where
  if (!isNil(isPublic)) {
    where = { public: isPublic }
  }

  return connectionFromPromisedArray(
    articleService.find({
      where
    }),
    connectionArgs
  )
}
