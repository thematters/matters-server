import { optimism, optimismSepolia, polygon, polygonMumbai } from 'viem/chains'

import { environment, isProd } from 'common/environment'
import { GQLChain } from 'definitions'

export const rpcs: { [chainId: number]: string } = {
  [polygon.id]: `https://polygon-mainnet.g.alchemy.com/v2/${environment.alchemyApiKey}`,
  [polygonMumbai.id]: `https://polygon-mumbai.g.alchemy.com/v2/${environment.alchemyApiKey}`,
}

export const getChainId = (chain: GQLChain) => {
  const chainIds = isProd
    ? { Polygon: polygon.id, Optimism: optimism.id }
    : { Polygon: polygonMumbai.id, Optimism: optimismSepolia.id }

  return chainIds[chain]
}
