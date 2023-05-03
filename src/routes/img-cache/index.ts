import { Request, Response, Router } from 'express'
import { v4 } from 'uuid'

import { getViewerFromReq } from 'common/utils'
import { cfsvc } from 'connectors'
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
    key = await cfsvc.baseServerSideUploadFile(
      GQLAssetType.imgCached,
      origUrl,
      uuid
    )
  } catch (err) {
    console.error(new Date(), 'cloudflare upload image ERROR:', err)
    res.status(400).end()
    return
  }
  if (!key) {
    res.status(403).end()
    return
  }

  res.redirect(cfsvc.genUrl(key))
})
