require('module-alias/register')

import fs from 'fs'
import { printSchema } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'

import logger from 'common/logger'
import typeDefs from 'types'

const schemaObj = makeExecutableSchema({
  typeDefs,
  resolverValidationOptions: {
    requireResolversForResolveType: false
  }
})

const schemaString = printSchema(schemaObj)

fs.writeFile('schema.graphql', schemaString, function(err) {
  if (err) {
    logger.error(err)
  } else {
    logger.info('Successfully printed schema.')
  }
})
