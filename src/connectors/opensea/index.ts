import { DataSourceConfig } from 'apollo-datasource'
import { RequestOptions, RESTDataSource } from 'apollo-datasource-rest'

import { environment } from 'common/environment'
import logger from 'common/logger'

export default class OpenSeaService extends RESTDataSource {
  apiKey?: string | undefined

  constructor() {
    super()
    // Sets the base URL for the REST API
    // https://rinkeby-api.opensea.io/api
    // or https://api.opensea.io/api/v1/assets?asset_contract_address=<...>&owner=<...>
    this.baseURL = environment.openseaAPIBase
    this.apiKey = environment.openseaAPIKey
    // this.initialize(config)
    this.initialize({} as DataSourceConfig<any>)
  }

  willSendRequest(request: RequestOptions) {
    if (this.apiKey) {
      request.headers.set('X-API-KEY', this.apiKey)
    }
  }

  async getAssets({
    owner,
    asset_contract_address = environment.nftContractAddress,
  }: {
    owner: string
    asset_contract_address?: string
  }) {
    try {
      logger.info(
        `fetching assets for address ${JSON.stringify({
          owner,
          asset_contract_address,
        })}, with baseURL: "${this.baseURL}"`
      )

      const data = await this.get('assets', {
        // Query parameters
        owner,
        asset_contract_address,
        order_direction: 'desc',
        offset: 0,
        limit: 20,
      })

      logger.info(`fetched ${data.assets?.length} assets.`)
      return data.assets
    } catch (err) {
      logger.error(err)
      console.error(new Date(), 'ERROR:', err)
    }
  }
}
