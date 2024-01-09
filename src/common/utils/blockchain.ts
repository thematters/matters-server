import { formatUnits, parseUnits } from 'viem'

import { environment } from 'common/environment'

export const mainnetPolygonRpc = `https://polygon-mainnet.g.alchemy.com/v2/${environment.alchemyApiKey}`
export const mumbaiPolygonRpc = `https://polygon-mumbai.g.alchemy.com/v2/${environment.alchemyApiKey}`

export const toTokenBaseUnit = (amount: string, decimals: number): string =>
  parseUnits(amount, decimals).toString()

export const fromTokenBaseUnit = (amount: string, decimals: number): string =>
  formatUnits(BigInt(amount), decimals)
