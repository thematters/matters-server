import { optimism, optimismSepolia, polygon, polygonMumbai } from 'viem/chains'

import { environment, isProd } from 'common/environment'
import { GQLChain } from 'definitions'

export const rpcs: { [chainId: number]: string } = {
  [polygon.id]: `https://polygon-mainnet.g.alchemy.com/v2/${environment.alchemyApiKey}`,
  [polygonMumbai.id]: `https://polygon-mumbai.g.alchemy.com/v2/${environment.alchemyApiKey}`,
  [optimism.id]: `https://opt-mainnet.g.alchemy.com/v2/${environment.alchemyApiKey}`,
  [optimismSepolia.id]: `https://opt-sepolia.g.alchemy.com/v2/${environment.alchemyApiKey}`,
}

export const getChainId = (chain: GQLChain) => {
  const chainIds = isProd
    ? { Polygon: polygon.id, Optimism: optimism.id }
    : { Polygon: polygonMumbai.id, Optimism: optimismSepolia.id }

  return chainIds[chain]
}

export const getChain = (chainId: number | string): GQLChain => {
  const chains = {
    [polygon.id]: 'Polygon',
    [polygonMumbai.id]: 'Polygon',
    [optimism.id]: 'Optimism',
    [optimismSepolia.id]: 'Optimism',
  }

  return chains[chainId as keyof typeof chains] as GQLChain
}
