import FormData from 'form-data'
import mime from 'mime-types'
import fetch from 'node-fetch'
import path from 'path'

import { environment, isProd, isTest } from 'common/environment'
import { ActionFailedError, UserInputError } from 'common/errors'
import { getLogger } from 'common/logger'
import { GQLAssetType } from 'definitions'

const logger = getLogger('service-cloudflare')

const envPrefix = isProd ? 'prod' : 'non-prod'

const CLOUDFLARE_IMAGES_URL = `https://api.cloudflare.com/client/v4/accounts/${environment.cloudflareAccountId}/images/v1`
const CLOUDFLARE_IMAGES_DIRECT_UPLOAD_ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/${environment.cloudflareAccountId}/images/v2/direct_upload`
const CLOUDFLARE_IMAGE_ENDPOINT = `https://imagedelivery.net/${environment.cloudflareAccountHash}/${envPrefix}`

export class CloudflareService {
  baseUploadFileByUrl = async (
    folder: GQLAssetType,
    url: string,
    uuid?: string
  ): Promise<string | never> => {
    if (url.startsWith(CLOUDFLARE_IMAGE_ENDPOINT)) {
      // handle urls like: 'https://imagedelivery.net/kDRxxxm-pYA/non-prod/cover/uuid-or-path-to-image.jpeg/public' or another variant

      // strip /public, /1280w etc.
      const lastIdx = url.lastIndexOf('/')

      return url.substring(CLOUDFLARE_IMAGE_ENDPOINT.length + 1, lastIdx)
    }

    const key = this.genKey(folder, uuid!, path.extname(url).toLowerCase())

    const formData = new FormData()
    formData.append('url', url)
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
        'error: %o ok: %o headers: %o',
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

  directUploadImage = async (folder: GQLAssetType, uuid: string) => {
    const key = this.genKey(folder, uuid, 'jpeg') // assume jpeg, 'cause can no way know extension before uploaded

    const formData = new FormData()
    formData.append('id', envPrefix + '/' + key)
    // formData.append('requireSignedURLs', true)
    // formData.append('metadata', JSON.stringify({ key: 'value' }))

    const res = await fetch(CLOUDFLARE_IMAGES_DIRECT_UPLOAD_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${environment.cloudflareApiToken}`,
      },
      body: formData,
    })

    try {
      const resData = await res.json()
      logger.info('direct upload image: %j', resData)
      if (resData?.success) {
        return {
          key,
          ...(resData.result as { id: string; uploadURL: string }),
        }
      }
    } catch (err) {
      logger.error(
        'error: %o ok: %o headers: %o',
        err,
        res.ok,
        res.headers
        // await res.text()
      )
    }
  }

  // TODO:
  // getImage = async (id: string) => {}

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

  public turnstileVerify = async ({
    token,
    ip,
  }: {
    token?: string
    ip?: string
  }) => {
    // skip test
    if (isTest) {
      return true
    }

    if (!token) {
      throw new UserInputError(
        'operation is only allowed on matters.{town,news}'
      )
    }

    // Turing test with recaptcha
    const formData = new FormData()
    // formData.append('url', url)
    formData.append('secret', environment.cloudflareTurnstileSecretKey)
    formData.append('response', token)
    formData.append('remoteip', ip)

    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: formData,
      }
    )
    logger.info('cloudflare turnstile res: %o', res.ok, res.headers)

    const data = await res.json()
    logger.info('cloudflare turnstile res data: %o', data)
    if (!data?.success) {
      // logger.warn('cloudflare turnstile no success: %o', data)
      throw new ActionFailedError(`please try again: ${data['error-codes']}`)
    }

    return true
  }
}

export const cfsvc = new CloudflareService()
