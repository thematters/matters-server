import type { ASSET_TYPE } from 'common/enums/index.js'

export interface Asset {
  id: string
  uuid: string
  path: string
  type: ASSET_TYPE
  authorId: string | null
}

export interface AssetMap {
  id: string
  assetId: string
  entityTypeId: string
  entityId: string
}
