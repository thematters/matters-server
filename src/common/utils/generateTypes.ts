import fs from 'fs'
import { generateTypeScriptTypes } from 'graphql-schema-typescript'
import 'module-alias/register'

import { getLogger } from 'common/logger'

const logger = getLogger('utils')

const schema = fs.readFileSync('schema.graphql', { encoding: 'utf8' })

generateTypeScriptTypes(schema, 'src/definitions/schema.d.ts', {
  contextType: 'Context',
  importStatements: ["import { Context } from './index'"],
})
  .then(() => {
    logger.info('DONE')
    process.exit(0)
  })
  .catch((err) => {
    console.log(err)
    logger.error(err)
    process.exit(1)
  })
