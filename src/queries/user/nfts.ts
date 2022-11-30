import { CACHE_PREFIX, CACHE_TTL, NODE_TYPES } from 'common/enums'
import { environment, isDev } from 'common/environment'
import { toGlobalId } from 'common/utils'
import { CacheService } from 'connectors'
import { alchemy, AlchemyNetwork } from 'connectors/alchemy/index'
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
  const contract = isDev ? environment.spaceGameContractAddress : environment.traveloggersContractAddress
  const network =  isDev ? AlchemyNetwork.PolygonMainnet : AlchemyNetwork.Mainnet
  const assets = await cacheService.getObject({
    keys: { type: 'traveloggers', id: owner },
    getter: () => alchemy.getNFTs({ owner, contract, network }),
    expire: CACHE_TTL.LONG,
  })

  return Array.isArray(assets) && assets.length > 0
}

export const nfts: CryptoWalletToNftsResolver = async (
  { userId, address },
  _,
  { dataSources: { userService } }
) => {
  const user = await userService.baseFindById(userId)
  const owner = user?.ethAddress || address
  const contract = isDev ? environment.spaceGameContractAddress : environment.traveloggersContractAddress
  const network =  isDev ? AlchemyNetwork.PolygonMainnet : AlchemyNetwork.Mainnet
  const withMetadata = true
  const assets = await alchemy.getNFTs({
    owner,
    network,
    contract,
    withMetadata,
  })
  const cacheService = new CacheService(CACHE_PREFIX.NFTS)
  await cacheService.storeObject({
    keys: { type: 'traveloggers', id: owner },
    data: assets,
    expire: CACHE_TTL.LONG,
  })

  return assets.ownedNfts.map(
    ({ id, description, title, contractMetadata, media }: OpenSeaNFTAsset) => ({
      id: toGlobalId({
        type: NODE_TYPES.CryptoWalletNFTAsset,
        id: `${contractMetadata.symbol}#${id.tokenId}`,
      }),
      description,
      name: title,
      imageUrl: media[0].gateway,
      imagePreviewUrl: media[0].gateway,
      contractAddress: contract,
      collectionName: contractMetadata.name,
    })
  )
}
