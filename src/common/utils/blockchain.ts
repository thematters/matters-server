import { formatUnits, parseUnits } from 'viem'
import { polygon, polygonMumbai } from 'viem/chains'

import { environment } from 'common/environment'

export const rpcs: { [chainId: number]: string } = {
  [polygon.id]: `https://polygon-mainnet.g.alchemy.com/v2/${environment.alchemyApiKey}`,
  [polygonMumbai.id]: `https://polygon-mumbai.g.alchemy.com/v2/${environment.alchemyApiKey}`,
}

export const toTokenBaseUnit = (amount: string, decimals: number): string =>
  parseUnits(amount, decimals).toString()

export const fromTokenBaseUnit = (amount: string, decimals: number): string =>
  formatUnits(BigInt(amount), decimals)
