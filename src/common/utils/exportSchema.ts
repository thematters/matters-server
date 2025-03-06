import { makeExecutableSchema } from '@graphql-tools/schema'
import fs from 'fs'
import { printSchema } from 'graphql'
import 'module-alias/register.js'

import { typeDefs } from '../../schema.js'

const schema = makeExecutableSchema({ typeDefs })
const schemaString = printSchema(schema)

fs.writeFile('schema.graphql', schemaString, (err) => {
  if (err) {
    console.error(err)
    process.exit(1)
  } else {
    console.info('Successfully printed schema.')
    process.exit(0)
  }
})
