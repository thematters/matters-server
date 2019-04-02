import { v4 } from 'uuid'

import { ItemData, MutationToSingleFileUploadResolver } from 'definitions'
import { UserInputError } from 'common/errors'
import axios from 'axios'

const resolver: MutationToSingleFileUploadResolver = async (
  root,
  { input: { type, file, url } },
  { viewer, dataSources: { systemService } }
) => {
  if ((!file && !url) || (file && url)) {
    throw new UserInputError('One of file and url needs to be speficied.')
  }

  let upload
  if (url) {
    try {
      const res = await axios.get(url, { responseType: 'stream' })
      const disposition = res.headers['content-disposition']
      const filename =
        (disposition && decodeURI(disposition.match(/filename="(.*)"/)[1])) ||
        url
          .split('/')
          .pop()
          .split('?')[0]

      upload = {
        createReadStream: () => res.data,
        mimetype: res.headers['content-type'],
        encoding: 'utf8',
        filename
      }
    } catch (err) {
      throw new UserInputError(`Unable to upload from url: ${err}`)
    }
  } else {
    upload = await file
  }

  const key = await systemService.aws.baseUploadFile(type, upload)
  const asset: ItemData = {
    uuid: v4(),
    authorId: viewer.id,
    type,
    path: key
  }
  const newAsset = await systemService.baseCreate(asset, 'asset')
  return {
    ...newAsset,
    path: `${systemService.aws.s3Endpoint}/${newAsset.path}`
  }
}

export default resolver
