import { CACHE_PREFIX, CACHE_TTL, NODE_TYPES } from 'common/enums/index.js'
import { environment, imgCacheServicePrefix } from 'common/environment.js'
import { toGlobalId } from 'common/utils/index.js'
import { alchemy, AlchemyNetwork } from 'connectors/alchemy/index.js'
import { CacheService } from 'connectors/index.js'
import {
  CryptoWalletToHasNFTsResolver,
  CryptoWalletToNftsResolver,
} from 'definitions'
interface OpenSeaNFTAsset {
  id: any
  token_id: string
  title: string
  description: string | null
  contractMetadata: any
  media: any
}

export const hasNFTs: CryptoWalletToHasNFTsResolver = async (
  { userId, address },
  _,
  { dataSources: { userService } }
) => {
  const cacheService = new CacheService(CACHE_PREFIX.NFTS)

  const user = await userService.baseFindById(userId)
  const owner = user?.ethAddress || address
  const contract = environment.traveloggersContractAddress
  const withMetadata = true

  const network = AlchemyNetwork.Mainnet
  const assets = (await cacheService.getObject({
    keys: { type: 'traveloggers', id: owner },
    getter: () => alchemy.getNFTs({ owner, contract, network, withMetadata }),
    expire: CACHE_TTL.LONG,
  })) as any

  return Array.isArray(assets?.ownedNfts) && assets.ownedNfts.length > 0
}

export const nfts: CryptoWalletToNftsResolver = async (
  { userId, address },
  _,
  { dataSources: { userService } }
) => {
  const cacheService = new CacheService(CACHE_PREFIX.NFTS)

  const user = await userService.baseFindById(userId)
  const owner = user?.ethAddress || address
  const contract = environment.traveloggersContractAddress
  const network = AlchemyNetwork.Mainnet
  const withMetadata = true

  const assets = (await cacheService.getObject({
    keys: { type: 'traveloggers', id: owner },
    getter: () => alchemy.getNFTs({ owner, network, contract, withMetadata }),
    expire: CACHE_TTL.LONG,
  })) as any

  return (assets?.ownedNfts || []).map(
    ({ id, description, title, contractMetadata, media }: OpenSeaNFTAsset) => ({
      id: toGlobalId({
        type: NODE_TYPES.CryptoWalletNFTAsset,
        id: `${contractMetadata.symbol}#${id.tokenId}`,
      }),
      description,
      name: title,
      imageUrl: `${imgCacheServicePrefix}/${media[0].gateway}`,
      imagePreviewUrl: `${imgCacheServicePrefix}/${media[0].gateway}`,
      contractAddress: contract,
      collectionName: contractMetadata.name,
    })
  )
}
