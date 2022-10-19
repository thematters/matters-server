import { ethers } from 'ethers'

import { isProd } from 'common/environment'

// TODO getProvider should accept chain name
export const getProvider = () =>
  new ethers.providers.JsonRpcProvider(
    isProd ? 'https://polygon-rpc.com/' : 'https://rpc-mumbai.matic.today'
  )

export const getAlchemyProvider = () =>
  new ethers.providers.JsonRpcProvider(
    isProd ? 'https://polygon-rpc.com/' : 'https://polygon-mumbai.g.alchemy.com/v2/YP5enfPGu-CS1_UJyakGQa5gm6JHkeX7'
  )

export const toTokenBaseUnit = (amount: string, decimals: number): string =>
  ethers.utils.parseUnits(amount, decimals).toString()

export const fromTokenBaseUnit = (amount: ethers.BigNumber, decimals: number): string =>
  ethers.utils.formatUnits(amount, decimals)
