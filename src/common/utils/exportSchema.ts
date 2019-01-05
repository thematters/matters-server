require('module-alias/register')

import { printSchema } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'
import fs from 'fs'
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
    console.error(err)
  } else {
    console.log('Successfully printed schema.')
  }
})
