import { providers } from 'ethers'

import { getAlchemyProvider } from 'common/utils'

export class Provider {
  private _provider: providers.Provider
  constructor(chainId: number) {
    this._provider = getAlchemyProvider(chainId)
  }

  getBlockNumber = async (): Promise<number> => {
    return this._provider.getBlockNumber()
  }
}
