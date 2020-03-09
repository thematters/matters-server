import * as cheerio from 'cheerio'
import getStream from 'get-stream'

import { OAUTH_PROVIDER } from 'common/enums'
import { AuthenticationError, UserInputError } from 'common/errors'
import { migrationQueue } from 'connectors/queue/migration'
import { MutationToMigrationResolver } from 'definitions'

const resolver: MutationToMigrationResolver = async (
  _,
  { input: { type, files } },
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission.')
  }

  if (!type) {
    throw new UserInputError('migration type is not specified.')
  }

  if (!files || files.length === 0) {
    throw new UserInputError('migration files are not provided.')
  }

  // pre-process uploaded migration data
  const uploads = await Promise.all(files.map(file => file))
  const htmls = await Promise.all(
    uploads.map(async upload => {
      const { createReadStream, mimetype } = upload
      if (!createReadStream || mimetype !== 'text/html') {
        return ''
      }

      const stream = createReadStream()
      const content = await getStream(stream)
      const $ = cheerio.load(content || '', { decodeEntities: false })

      // cleanup unnecessary elements
      $('*')
        .removeAttr('id')
        .removeAttr('name')
        .removeAttr('style')
      $('section.p-summary, footer').remove()
      return $('article').html() || ''
    })
  )

  // push to queue
  migrationQueue.migrate({ type, userId: viewer.id, htmls })
  return true
}

export default resolver
