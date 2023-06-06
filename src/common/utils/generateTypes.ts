import { generateTypeScriptTypes } from '@jlowcs/graphql-schema-typescript'
import fs from 'fs'
import 'module-alias/register'

const schema = fs.readFileSync('schema.graphql', { encoding: 'utf8' })

generateTypeScriptTypes(schema, 'src/definitions/schema.d.ts', {
  contextType: 'Context',
  importStatements: ["import { Context } from './index'"],
})
  .then(() => {
    console.info('DONE')
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
