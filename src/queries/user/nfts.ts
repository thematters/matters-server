import { CACHE_PREFIX, CACHE_TTL, NODE_TYPES } from 'common/enums'
import { imgCacheServicePrefix } from 'common/environment'
import { toGlobalId } from 'common/utils'
import { CacheService } from 'connectors'
import OpenSeaService from 'connectors/opensea'
import {
  // UserToAvatarResolver,
  CryptoWalletToHasNFTsResolver,
  CryptoWalletToNftsResolver,
} from 'definitions'

interface OpenSeaNFTAsset {
  id: number
  token_id: string
  name: string
  description: string | null
  image_url: string
  image_preview_url: string
  image_thumbnail_url: string
  image_original_url: string
  asset_contract: Record<string, any>
  collection: Record<string, any>
  token_metadata: string
  permalink: string
}

const getAssetsByOwner = async (owner: string) => {
  const oseaService = new OpenSeaService()
  return oseaService.getAssets({ owner })
}

export const hasNFTs: CryptoWalletToHasNFTsResolver = async ({ address }) => {
  const cacheService = new CacheService(CACHE_PREFIX.NFTS)

  const assets = await cacheService.getObject({
    keys: { type: 'traveloggers', id: address },
    getter: async () => {
      const assets0 = await getAssetsByOwner(address)
      return JSON.stringify(assets0)
    },
    expire: CACHE_TTL.LONG,
  })

  return Array.isArray(assets) && assets.length > 0
}

export const nfts: CryptoWalletToNftsResolver = async ({ address }) => {
  const assets = await getAssetsByOwner(address)

  const cacheService = new CacheService(CACHE_PREFIX.NFTS)
  await cacheService.storeObject({
    // keys: { type, id, field, args }
    keys: { type: 'traveloggers', id: address },
    data: assets,
    expire: CACHE_TTL.LONG,
  })

  return assets
    ?.filter(
      // testnet takes longer to refresh
      // if no image_original_url, there's no way can show it
      ({ image_original_url }: OpenSeaNFTAsset) => !!image_original_url
    )
    .map(
      ({
        token_id,
        name,
        description,
        image_url,
        image_preview_url,
        asset_contract,
        collection,
        token_metadata,
        permalink,
      }: OpenSeaNFTAsset) => ({
        id: toGlobalId({
          type: NODE_TYPES.CryptoWalletNFTAsset,
          id: `${asset_contract.symbol}#${token_id}`,
        }),
        name,
        description,
        imageUrl: `${imgCacheServicePrefix}/${image_url}`,
        imagePreviewUrl: `${imgCacheServicePrefix}/${image_preview_url}`,
        // imageOriginalUrl: image_original_url || '',
        contractAddress: asset_contract.address,
        collectionName: collection.name,
        tokenMetadata: token_metadata,
        openseaPermalink: permalink,
      })
    )
}
