import { makeExecutableSchema } from '@graphql-tools/schema'
import fs from 'fs'
import { printSchema } from 'graphql'
import 'module-alias/register'

import { getLogger } from 'common/logger'

import { typeDefs } from '../../schema'

const logger = getLogger('utils')

const schema = makeExecutableSchema({ typeDefs })
const schemaString = printSchema(schema)

fs.writeFile('schema.graphql', schemaString, (err) => {
  if (err) {
    logger.error(err)
  } else {
    logger.info('Successfully printed schema.')
  }
  process.exit()
})
