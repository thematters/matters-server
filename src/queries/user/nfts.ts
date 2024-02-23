import type { GQLCryptoWalletResolvers } from 'definitions'

import { CACHE_PREFIX, CACHE_TTL, NODE_TYPES } from 'common/enums'
import { contract } from 'common/environment'
import { toGlobalId } from 'common/utils'
import { CacheService } from 'connectors'
import { alchemy, AlchemyNetwork } from 'connectors/alchemy'

interface OpenSeaNFTAsset {
  id: any
  token_id: string
  title: string
  description: string | null
  contractMetadata: any
  media: any
}

export const hasNFTs: GQLCryptoWalletResolvers['hasNFTs'] = async (
  { userId, address },
  _,
  {
    dataSources: {
      userService,
      connections: { redis },
    },
  }
) => {
  const cacheService = new CacheService(CACHE_PREFIX.NFTS, redis)

  const user = await userService.baseFindById(userId)
  const owner = user?.ethAddress || address
  const withMetadata = true

  const network = AlchemyNetwork.Mainnet
  const assets = (await cacheService.getObject({
    keys: { type: 'traveloggers', id: owner },
    getter: () =>
      alchemy.getNFTs({
        owner,
        contract: contract.ethereum.traveloggersAddress,
        network,
        withMetadata,
      }),
    expire: CACHE_TTL.LONG,
  })) as any

  return Array.isArray(assets?.ownedNfts) && assets.ownedNfts.length > 0
}

export const nfts: GQLCryptoWalletResolvers['nfts'] = async (
  { userId, address },
  _,
  {
    dataSources: {
      userService,
      connections: { redis },
    },
  }
) => {
  const cacheService = new CacheService(CACHE_PREFIX.NFTS, redis)

  const user = await userService.baseFindById(userId)
  const owner = user?.ethAddress || address
  const network = AlchemyNetwork.Mainnet
  const withMetadata = true

  const assets = (await cacheService.getObject({
    keys: { type: 'traveloggers', id: owner },
    getter: () =>
      alchemy.getNFTs({
        owner,
        network,
        contract: contract.ethereum.traveloggersAddress,
        withMetadata,
      }),
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
      imageUrl: media[0].gateway,
      imagePreviewUrl: media[0].gateway,
      contractAddress: contract,
      collectionName: contractMetadata.name,
    })
  )
}
