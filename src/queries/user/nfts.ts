import type { GQLCryptoWalletResolvers } from '#definitions/index.js'

import { CACHE_PREFIX, CACHE_TTL, NODE_TYPES } from '#common/enums/index.js'
import { contract } from '#common/environment.js'
import { toGlobalId } from '#common/utils/index.js'
import { alchemy, AlchemyNetwork } from '#connectors/alchemy/index.js'
import { Cache } from '#connectors/index.js'

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
      connections: { objectCacheRedis },
    },
  }
) => {
  const cache = new Cache(CACHE_PREFIX.NFTS, objectCacheRedis)

  const withMetadata = true

  const network = AlchemyNetwork.Mainnet
  const assets = (await cache.getObject({
    keys: { type: 'traveloggers', id: userId },
    getter: () =>
      alchemy.getNFTs({
        owner: address,
        contract: contract.Ethereum.traveloggersAddress,
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
      connections: { objectCacheRedis },
    },
  }
) => {
  const cache = new Cache(CACHE_PREFIX.NFTS, objectCacheRedis)

  const network = AlchemyNetwork.Mainnet
  const withMetadata = true

  const assets = (await cache.getObject({
    keys: { type: 'traveloggers', id: userId },
    getter: () =>
      alchemy.getNFTs({
        owner: address,
        network,
        contract: contract.Ethereum.traveloggersAddress,
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
