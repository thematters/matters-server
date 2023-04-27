import FormData from 'form-data'
import mime from 'mime-types'
import fetch from 'node-fetch'
import path from 'path'

import { environment, isProd } from 'common/environment'
import { GQLAssetType } from 'definitions'

const envPrefix = isProd ? 'prod' : 'non-prod'

const CLOUDFLARE_IMAGES_URL = `https://api.cloudflare.com/client/v4/accounts/${environment.cloudflareAccountId}/images/v1`

export class CloudflareService {
  // constructor() {}

  // server side fetch and cache an image url
  // throws any axios error
  baseServerSideUploadFile = async (
    folder: GQLAssetType,
    origUrl: string,
    uuid: string
  ): Promise<string | undefined> => {
    // const mimetype = mime.lookup(origUrl)
    // const extension = mime.extension(mimetype as string)
    const key = `${envPrefix}/${folder}/${uuid}.${path
      .extname(origUrl)
      .toLowerCase()}`

    const formData = new FormData()
    formData.append('url', origUrl)
    formData.append('id', key)

    const res = await fetch(CLOUDFLARE_IMAGES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${environment.cloudflareApiToken}`,
      },
      body: formData,
    })

    try {
      const resData = await res.json()

      // assert "success": true,

      return resData.result.id // the key
    } catch (err) {
      console.error(
        new Date(),
        'CloudflareService upload image ERROR:',
        err,
        res.ok,
        res.headers
        // await res.text()
      )
    }
  }

  baseUploadFile = async (folder: GQLAssetType, upload: any, uuid: string) => {
    const { createReadStream, mimetype, filename } = upload
    const stream = createReadStream()
    // const buffer = await getStream.buffer(stream)

    const extension = mime.extension(mimetype)

    if (!extension) {
      throw new Error('Invalid file type.')
    }

    const key = `${envPrefix}/${folder}/${uuid}.${extension}`

    const formData = new FormData()
    formData.append('file', stream, filename)
    formData.append('id', key)

    const res = await fetch(CLOUDFLARE_IMAGES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${environment.cloudflareApiToken}`,
      },
      body: formData,
    })

    try {
      const resData = await res.json()

      // assert "success": true,

      return resData.result.id // the key
    } catch (err) {
      console.error(
        new Date(),
        'CloudflareService upload image ERROR:',
        err,
        res.ok,
        res.headers
        // await res.text()
      )
    }
  }

  /**
   * Delete file from Cloudflare Images by a given path key.
   */
  baseDeleteFile = async (id: string) => {
    const res = await fetch(CLOUDFLARE_IMAGES_URL + `/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${environment.cloudflareApiToken}`,
      },
    })

    // assert "success": true
    return res.json()
  }
}

export const cfsvc = new CloudflareService()
