import { Request, Response, Router } from 'express'
import { v4 } from 'uuid'

import { getViewerFromReq } from 'common/utils'
import { aws, cfsvc } from 'connectors'
import { GQLAssetType } from 'definitions'

export const imgCache = Router()

imgCache.get('/*', async (req: Request, res: Response) => {
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

  let key: string | undefined
  try {
    const uuid = v4()
    const [awsRes, cfsvcRes] = await Promise.allSettled([
      aws.baseServerSideUploadFile(GQLAssetType.imgCached, origUrl, uuid),
      cfsvc.baseServerSideUploadFile(GQLAssetType.imgCached, origUrl, uuid),
    ])
    if (awsRes.status !== 'fulfilled' || cfsvcRes.status !== 'fulfilled') {
      if (awsRes.status !== 'fulfilled') {
        console.error(new Date(), 'aws s3 upload image ERROR:', awsRes.reason)
        throw awsRes.reason
      }
      if (cfsvcRes.status !== 'fulfilled') {
        console.error(
          new Date(),
          'cloudflare upload image ERROR:',
          cfsvcRes.reason
        )
        throw cfsvcRes.reason
      }
    }

    key = awsRes.value
  } catch (err) {
    res.status(400).end()
    return
  }
  if (!key) {
    res.status(403).end()
    return
  }

  const newPath = `${aws.s3Endpoint}/${key}`

  res.redirect(newPath)
})
