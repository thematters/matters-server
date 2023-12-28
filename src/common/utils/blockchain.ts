import { createPublicClient, formatUnits, http, parseUnits } from 'viem'
import { polygon, polygonMumbai } from 'viem/chains'

import { BLOCKCHAIN, BLOCKCHAIN_CHAINID } from 'common/enums'
import { environment } from 'common/environment'

export const publicClient = (chainId: number) => {
  const isMainnetPolygon =
    chainId.toString() === BLOCKCHAIN_CHAINID[BLOCKCHAIN.Polygon].PolygonMainnet
  const mainnetPolygonRpc = `https://polygon-mainnet.g.alchemy.com/v2/${environment.alchemyApiKey}`
  const mumbaiPolygonRpc = `https://polygon-mumbai.g.alchemy.com/v2/${environment.alchemyApiKey}`

  return createPublicClient({
    chain: isMainnetPolygon ? polygon : polygonMumbai,
    transport: isMainnetPolygon
      ? http(mainnetPolygonRpc)
      : http(mumbaiPolygonRpc),
  })
}

export const toTokenBaseUnit = (amount: string, decimals: number): string =>
  parseUnits(amount, decimals).toString()

export const fromTokenBaseUnit = (amount: string, decimals: number): string =>
  formatUnits(BigInt(amount), decimals)
