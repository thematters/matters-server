import { NODE_TYPES } from 'common/enums'
import { imgCacheServicePrefix } from 'common/environment'
import { toGlobalId } from 'common/utils'
import OpenSeaService from 'connectors/opensea'
import { UserToAvatarResolver } from 'definitions'

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

const resolver: UserToAvatarResolver = async ({ address }) => {
  const oseaService = new OpenSeaService()
  const assets = await oseaService.getAssets({ owner: address })

  return assets
    .filter(
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

export default resolver
