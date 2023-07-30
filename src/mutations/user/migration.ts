import type { GQLMutationResolvers } from 'definitions'

import * as cheerio from 'cheerio'
import getStream from 'get-stream'

import { UPLOAD_MIGRATION_SIZE_LIMIT } from 'common/enums'
import {
  AuthenticationError,
  MigrationReachLimitError,
  UserInputError,
} from 'common/errors'
import { migrationQueue } from 'connectors/queue'

const resolver: GQLMutationResolvers['migration'] = async (
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
  let totalSize = 0
  const uploads = await Promise.all(files.map((file) => file))

  const htmls: string[] = []
  for (const upload of uploads) {
    try {
      const { createReadStream, mimetype } = upload.file

      if (!createReadStream || mimetype !== 'text/html') {
        return ''
      }

      const stream = createReadStream()
      const buffer = await getStream.buffer(stream, {
        maxBuffer: UPLOAD_MIGRATION_SIZE_LIMIT,
      })
      totalSize = totalSize + buffer.byteLength

      if (totalSize > UPLOAD_MIGRATION_SIZE_LIMIT) {
        throw new MigrationReachLimitError(
          'total size of migration files reaches limit.'
        )
      }

      const content = buffer.toString('utf8')
      const $ = cheerio.load(content || '', { decodeEntities: false })

      // cleanup unnecessary attributes and elements
      $('*').removeAttr('id').removeAttr('name').removeAttr('style')
      $('section.p-summary, footer').remove()

      htmls.push($('article').html() || '')
    } catch (err: any) {
      const error =
        err.name === 'MaxBufferError'
          ? new MigrationReachLimitError('migration file size reaches limit.')
          : err
      throw error
      break
    }
  }

  // push to queue
  migrationQueue.migrate({ type, userId: viewer.id, htmls })
  return true
}

export default resolver
