import type { GlobalId } from '#definitions/index.js'

import { CACHE_KEYWORD, NODE_TYPES } from '#common/enums/index.js'
import { fromGlobalId } from '#common/utils/index.js'
import mutations from '#mutations/index.js'
import queries from '#queries/index.js'
import { makeExecutableSchema } from '@graphql-tools/schema'
import {
  logCacheDirective,
  purgeCacheDirective,
} from '@matters/apollo-response-cache'
import {
  constraintDirective,
  constraintDirectiveTypeDefs,
} from 'graphql-constraint-directive'
import merge from 'lodash/merge.js'

import {
  objectCacheDirective,
  privateCacheDirective,
  rateLimitDirective,
  authDirective,
} from './types/directives/index.js'
import baseTypeDefs from './types/index.js'

const typeResolver = (type: string, result: { __type?: string }) => {
  const unionsAndInterfaces = [
    NODE_TYPES.Node,
    NODE_TYPES.Notice,
    NODE_TYPES.Response,
    NODE_TYPES.TransactionTarget,
    NODE_TYPES.PinnableWork,
    NODE_TYPES.Writing,
    NODE_TYPES.Channel,
  ]

  if (unionsAndInterfaces.indexOf(type as NODE_TYPES) >= 0 && result?.__type) {
    return result.__type
  }

  return type
}

// handle null object to avoid error: Cannot read properties of null (reading 'id')
const idResolver = (type: string, result: { id?: GlobalId }) => {
  if (!result?.id) {
    return ''
  }

  try {
    const { id } = fromGlobalId(result?.id)
    return id
  } catch {
    return result.id
  }
}

// add directives

const { typeDef: authDirectiveTypeDef, transformer: authDirectiveTransformer } =
  authDirective()
const {
  typeDef: rateLimitDirectiveTypeDef,
  transformer: rateLimitDirectiveTransformer,
} = rateLimitDirective()
const {
  typeDef: privateCacheDirectiveTypeDef,
  transformer: privateCacheDirectiveTransformer,
} = privateCacheDirective()
const {
  typeDef: objectCacheDirectiveTypeDef,
  transformer: objectCacheDirectiveTransformer,
} = objectCacheDirective()
const {
  typeDef: logCacheDirectiveTypeDef,
  transformer: logCacheDirectiveTransformer,
} = logCacheDirective()
const {
  typeDef: purgeCacheDirectiveTypeDef,
  transformer: purgeCacheDirectiveTransformer,
} = purgeCacheDirective()

export const typeDefs = [
  constraintDirectiveTypeDefs,
  authDirectiveTypeDef,
  rateLimitDirectiveTypeDef,
  privateCacheDirectiveTypeDef,
  objectCacheDirectiveTypeDef,
  logCacheDirectiveTypeDef,
  purgeCacheDirectiveTypeDef,
  ...baseTypeDefs,
]

let schema = makeExecutableSchema({
  typeDefs,
  resolvers: merge(queries, mutations),
})

schema = constraintDirective()(schema)
schema = authDirectiveTransformer(schema)
schema = rateLimitDirectiveTransformer(schema)
schema = privateCacheDirectiveTransformer(schema)
schema = objectCacheDirectiveTransformer(schema)
schema = logCacheDirectiveTransformer(schema, { typeResolver, idResolver })
schema = purgeCacheDirectiveTransformer(schema, {
  typeResolver,
  idResolver,
  extraNodesPath: CACHE_KEYWORD,
})

export default schema
