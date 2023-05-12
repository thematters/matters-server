import { makeExecutableSchema } from '@graphql-tools/schema'
import fs from 'fs'
import { printSchema } from 'graphql'
import 'module-alias/register'

import { getLogger } from 'common/logger'
import typeDefs from 'types'
const logger = getLogger('default')

const schemaObj = makeExecutableSchema({
  typeDefs,
  // resolverValidationOptions: {
  // requireResolversForResolveType: false,
  // },
})

const schemaString = printSchema(schemaObj)

fs.writeFile('schema.graphql', schemaString, (err) => {
  if (err) {
    logger.error(err)
  } else {
    logger.info('Successfully printed schema.')
  }
})
