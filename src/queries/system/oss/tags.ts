import { connectionFromPromisedArray } from 'graphql-relay'

import { OSSToTagsResolver } from 'definitions'

export const tags: OSSToTagsResolver = (
  root,
  { input: { ...connectionArgs } },
  { viewer, dataSources: { tagService } }
) => connectionFromPromisedArray(tagService.find({}), connectionArgs)
