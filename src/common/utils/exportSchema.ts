import { makeExecutableSchema } from '@graphql-tools/schema'
import fs from 'fs'
import { printSchema } from 'graphql'

import logger from 'common/logger'
import typeDefs from 'types'

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
