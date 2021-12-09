// import cookie from 'cookie'
import { Request, Response, Router } from 'express'

import { getViewerFromReq } from 'common/utils'
import { aws } from 'connectors'
import { GQLAssetType } from 'definitions'

export const imgCache = Router()

imgCache.get('/*', async (req: Request, res: Response) => {
  // console.log(new Date(), 'reached here:', req.url, req.params)

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
    key = await aws.baseServerSideUploadFile(GQLAssetType.imgCached, origUrl)
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
