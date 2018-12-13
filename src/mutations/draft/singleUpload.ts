import * as fs from 'fs'
import { Resolver } from 'definitions'

const resolver: Resolver = async (
  root,
  { input: { file } }: any,
  { viewer, draftService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this')
  }
  const data = await file
  const { filename, mimetype, encoding } = data
  const path = await draftService.uploadFile('audioDraft', data)
  return { filename, mimetype, encoding, path }
}

export default resolver
