import { createPublicClient, formatUnits, http, parseUnits } from 'viem'
import { polygon, polygonMumbai } from 'viem/chains'

import { BLOCKCHAIN, BLOCKCHAIN_CHAINID } from 'common/enums'
import { environment, isProd } from 'common/environment'

// TODO getProvider should accept chain name
export const getProvider = () =>
  createPublicClient({
    chain: isProd ? polygon : polygonMumbai,
    transport: isProd ? http('https://polygon-rpc.com/') : http('https://rpc-mumbai.matic.today')
  })

// TODO: hard-coding polygon and polygon mumbai for now since
// viem does not support passing chain id, only chain names
export const getAlchemyProvider = (chainId: number) => {
  const isMainnetPolygon = chainId.toString() === BLOCKCHAIN_CHAINID[BLOCKCHAIN.Polygon].PolygonMainnet
  const mainnetPolygonRpc = `https://polygon-mainnet.g.alchemy.com/v2/${environment.alchemyApiKey}`
  const mumbaiPolygonRpc = `https://polygon-mumbai.g.alchemy.com/v2/${environment.alchemyApiKey}`

  return createPublicClient({
    chain: isMainnetPolygon ? polygon : polygonMumbai,
    transport: isMainnetPolygon ? http(mainnetPolygonRpc) : http(mumbaiPolygonRpc)
  })
}

export const toTokenBaseUnit = (amount: string, decimals: number): string =>
  parseUnits(amount, decimals).toString()

export const fromTokenBaseUnit = (amount: string, decimals: number): string =>
  formatUnits(BigInt(amount), decimals)
