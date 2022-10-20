import { ethers } from 'ethers'

import { environment, isProd } from 'common/environment'

// TODO getProvider should accept chain name
export const getProvider = () =>
  new ethers.providers.JsonRpcProvider(
    isProd ? 'https://polygon-rpc.com/' : 'https://rpc-mumbai.matic.today'
  )

export const getAlchemyProvider = (chainId: number) =>
  new ethers.providers.AlchemyProvider(chainId, environment.alchemyApiKey)

export const toTokenBaseUnit = (amount: string, decimals: number): string =>
  ethers.utils.parseUnits(amount, decimals).toString()

export const fromTokenBaseUnit = (amount: string, decimals: number): string =>
  ethers.utils.formatUnits(amount, decimals)
