import { polygon, polygonMumbai } from 'viem/chains'

import { environment } from 'common/environment'

export const rpcs: { [chainId: number]: string } = {
  [polygon.id]: `https://polygon-mainnet.g.alchemy.com/v2/${environment.alchemyApiKey}`,
  [polygonMumbai.id]: `https://polygon-mumbai.g.alchemy.com/v2/${environment.alchemyApiKey}`,
}
