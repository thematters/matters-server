import * as AWS from 'aws-sdk'
import { chunk } from 'lodash'
import DataLoader from 'dataloader'
import { environment } from '../common/'
import { log } from '../utils'
import { newrelic } from '../decorators'
import { tables } from './mockData'
import { QueryInput, UpdateItemInput } from 'aws-sdk/clients/dynamodb'

export interface BaseItem {
  [key: string]: any
}

export interface BaseParams {
  TableName: string
}

export interface Config {
  region: string
  accessKeyId: string
  secretAccessKey: string
  endpoint?: string
}

export type Item = { id: string; [key: string]: any }

export type TableName = 'article' | 'user' | 'comment' | 'action'

export type Params = { [key: string]: any }

export class BaseService {

  baseParams: BaseParams

  client: AWS.DynamoDB.DocumentClient

  config: Config

  items: Item[]

  prefix: string

  service: AWS.DynamoDB

  table: string

  constructor(table: TableName) {
    try {
      this.config = this.getConfig()
      this.service = new AWS.DynamoDB(this.config)
      this.client = new AWS.DynamoDB.DocumentClient({ service: this.service })
      this.prefix = this.getPrefix()
      this.table = `${this.prefix}${table}`
      this.baseParams = { TableName: this.table }
      this.items = tables[table]
    } catch (error) {
      log("Couldn't establish connection to database.")
      throw error
    }
  }

  /**
   * Get table prefix based on environment types.
   * For example:
   *   env: production --> production_table
   *   env: stage      --> stage_table
   *   env: dev        --> dev_table
   */
  getPrefix = (): string => {
    const { env } = environment
    return env === 'production' ? 'production_' : `${env}_`
  }

  /**
   * Get basic AWS service config. Property `endpoint` is required for local
   * development and default value should be `http://localhost:8000` when using
   * local DynamoDB service.
   */
  getConfig = (): Config => {
    const { env, region, accessId, accessKey } = environment
    const endpoint = env === 'dev' ? { endpoint: 'http://localhost:8000' } : {}
    return {
      region: region || '',
      accessKeyId: accessId || '',
      secretAccessKey: accessKey || '',
      ...endpoint
    }
  }

  /**
   * Get the number of items using `query` method.
   */
  baseCount = async (params: QueryInput): Promise<number> => {
    if (!params.hasOwnProperty('ProjectionExpression')) {
      params['ProjectionExpression'] = 'id'
    }
    const items: BaseItem[] = await this.baseQuery(params)
    return items.length || 0
  }

  /**
   * Get an array of items by given params using `batchGet` method.
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html
   */
  baseBatchGet = async (keys: BaseItem[]): Promise<any[]> => {
    let items: any[] = []
    let unprocessedKeys: BaseItem[] = keys
    while (unprocessedKeys && unprocessedKeys.length > 0) {
      const params = {
        RequestItems: {
          [this.table]: {
            Keys: unprocessedKeys
          }
        }
      }
      const { Responses: data } = await this.client.batchGet(params).promise()
      if (data) {
        if (data[this.table] && data[this.table].length > 0) {
          items = [...items, ...data[this.table]]
        }
        const restKeys: BaseItem = data['UnprocessedKeys']
        if (restKeys && restKeys.hasOwnProperty('Keys')) {
          unprocessedKeys = restKeys['Keys']
        }
      }
    }
    return items
  }

  /**
   * Get an array of items by given query string using `query` method.
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html
   */
  baseQuery = async (params: Partial<QueryInput>): Promise<any[]> => {
    let items: any[] = []
    let result: BaseItem = { LastEvaluatedKey: null }
    while (result && result.hasOwnProperty('LastEvaluatedKey')) {
      result = await this.client.query({
        ...this.baseParams,
        ...params,
        ExclusiveStartKey: result['LastEvaluatedKey']
      }).promise()
      if (result.Items) {
        items = [...items, ...result.Items]
      }
    }
    return items
  }

  /**
   * Create and return a new item.
   */
  create = async (item: Item): Promise<any> => {
    const params = {
      ...this.baseParams,
      Item: item
    }
    const newItem = await this.client.put(params).promise()
    return newItem
  }

  /**
   * Get an item by a given id.
   */
  findById = async (id: string): Promise<any | null> => {
    const params = {
      ...this.baseParams,
      Key: { id }
    }
    const { Item } = await this.client.get(params).promise()
    return Item || null
  }

  /**
   * Get an array of items by given ids. In order to reduce throttled requests,
   * we fetch items sequentially instead of `promise.all()`. Also, we have to
   * break ids into chunks due to DynamoDB limits.
   */
  findByIds = async (ids: string[]): Promise<any[]> => {
    let items: any[] = []
    for (const keys of chunk((ids.map(id => { return {id} })), 100)) {
      const data = await this.baseBatchGet(keys)
      items = [...items, ...data]
    }
    return items
  }

  /**
   * Update item.
   */
  update = async (params: Partial<UpdateItemInput>) => {
    const updateParams = {
      ...this.baseParams,
      ...params
    } as UpdateItemInput
    return this.client.update(updateParams).promise()
  }
}
