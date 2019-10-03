import fs from 'fs'
import { generateTypeScriptTypes } from 'graphql-schema-typescript'
import 'module-alias/register'

import logger from 'common/logger'

const schema = fs.readFileSync('schema.graphql', { encoding: 'utf8' })

generateTypeScriptTypes(schema, 'src/definitions/schema.d.ts', {
  contextType: 'Context',
  importStatements: ["import { Context } from './index'"]
})
  .then(() => {
    logger.info('DONE')
    process.exit(0)
  })
  .catch(err => {
    logger.error(err)
    process.exit(1)
  })
