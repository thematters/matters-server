import axios from 'axios'
// import cookie from 'cookie'
import { Request, Response, Router } from 'express'

import {
  // ASSET_TYPE,
  // COOKIE_TOKEN_NAME,
  UPLOAD_IMAGE_SIZE_LIMIT,
} from 'common/enums'
import { getFileName, getViewerFromReq } from 'common/utils'
import { aws } from 'connectors'
import { GQLAssetType } from 'definitions'

export const imgCache = Router()

imgCache.get('/*', async (req: Request, res: Response) => {
  console.log(new Date(), 'reached here:', req.url, req.params)

  let viewer
  try {
    viewer = await getViewerFromReq({ req })
  } catch (err) {
    console.error(new Date(), 'ERROR:', err)
  }
  if (!viewer?.id) {
    res.status(401).end()
    return
  }

  const origUrl = req.params[0]

  // const u = new URL(origUrl)
  // switch(u) {
  // if (!(u && u.protocol === 'https:' && u.hostname.match(/^[a-z0-9-]+\.googleusercontent\.com$/)))
  // res.redirect('https://assets.matters.news/...')

  if (!origUrl?.match(/^https:\/\/([a-z0-9-]+)\.googleusercontent\.com\//)) {
    res.status(403).end()
    return
  }

  let origRes: any
  try {
    origRes = await axios.get(origUrl, {
      responseType: 'stream',
      maxContentLength: UPLOAD_IMAGE_SIZE_LIMIT,
    })
  } catch (err) {
    // console.error(new Date, 'ERROR:', err)
    res.status(400).end()
    return
  }

  const disposition = origRes.headers['content-disposition']
  const filename = getFileName(disposition, origUrl)

  const upload = {
    createReadStream: () => origRes.data,
    mimetype: origRes.headers['content-type'],
    encoding: 'utf8',
    filename,
  }

  // const uuid = v4()
  const pathname = origUrl.substring(origUrl.lastIndexOf('/') + 1)
  const key = await aws.baseUploadFile(GQLAssetType.imgCached, upload, pathname)

  const newPath = `${aws.s3Endpoint}/${key}`
  res.redirect(newPath)
})
