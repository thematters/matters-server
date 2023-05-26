import FormData from 'form-data'
import mime from 'mime-types'
import fetch from 'node-fetch'
import path from 'path'

import { environment, isProd } from 'common/environment'
import { getLogger } from 'common/logger'
import { GQLAssetType } from 'definitions'

const logger = getLogger('service-cloudflare')

const envPrefix = isProd ? 'prod' : 'non-prod'

const CLOUDFLARE_IMAGES_URL = `https://api.cloudflare.com/client/v4/accounts/${environment.cloudflareAccountId}/images/v1`
const CLOUDFLARE_IMAGE_ENDPOINT = `https://imagedelivery.net/${environment.cloudflareAccountHash}/${envPrefix}`

export class CloudflareService {
  // constructor() {}

  // server side fetch and cache an image url
  // throws any axios error
  baseServerSideUploadFile = async (
    folder: GQLAssetType,
    origUrl: string,
    uuid: string
  ): Promise<string | never> => {
    // const mimetype = mime.lookup(origUrl)
    // const extension = mime.extension(mimetype as string)
    const key = this.genKey(folder, uuid, path.extname(origUrl).toLowerCase())

    const formData = new FormData()
    formData.append('url', origUrl)
    formData.append('id', envPrefix + '/' + key)

    const res = await fetch(CLOUDFLARE_IMAGES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${environment.cloudflareApiToken}`,
      },
      body: formData,
    })

    try {
      const resData = await res.json()

      logger.info('upload image: %j', resData)
    } catch (err) {
      logger.error(
        'error: %j ok: %j headers: %j',
        err,
        res.ok,
        res.headers
        // await res.text()
      )
    }
    return key
  }

  baseUploadFile = async (folder: GQLAssetType, upload: any, uuid: string) => {
    const { createReadStream, mimetype, filename } = upload
    const stream = createReadStream()
    // const buffer = await getStream.buffer(stream)

    const extension = mime.extension(mimetype)

    if (!extension) {
      throw new Error('Invalid file type.')
    }

    const key = this.genKey(folder, uuid, extension)

    const formData = new FormData()
    formData.append('file', stream, filename)
    formData.append('id', envPrefix + '/' + key)

    const res = await fetch(CLOUDFLARE_IMAGES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${environment.cloudflareApiToken}`,
      },
      body: formData,
    })

    try {
      const resData = await res.json()
      logger.info('upload image: %j', resData)
    } catch (err) {
      logger.error(
        'error: %j ok: %j headers: %j',
        err,
        res.ok,
        res.headers
        // await res.text()
      )
    }
    return key
  }

  getFileKeyByUrl = async (
    folder: GQLAssetType,
    origUrl: string,
    uuid: string
  ): Promise<string | never> => {
    const key = this.genKey(folder, uuid, path.extname(origUrl).toLowerCase())
    const url = `${CLOUDFLARE_IMAGES_URL}/${key}`

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${environment.cloudflareApiToken}`,
      },
    })

    try {
      const resData = await res.json()

      if (resData.result.id) {
        return key
      }

      return ''
    } catch (err) {
      return ''
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

  /**
   * Gen full url from keys (asset path in db).
   */
  genUrl = (key: string): string => `${CLOUDFLARE_IMAGE_ENDPOINT}/${key}/public`

  // internal helpers

  private genKey = (folder: string, uuid: string, extension: string): string =>
    `${folder}/${uuid}${extension ? '.' + extension : extension}`
}

export const cfsvc = new CloudflareService()
