import DataLoader from 'dataloader'
import { tables } from './mockData'

export type Item = { id: string; [k: string]: any }
export type TableName = 'article' | 'user' | 'comment' | 'action'

export class BaseService {
  items: Item[]

  loader: DataLoader<string, Item>

  constructor(table: TableName) {
    // replace items and related functions with dynamo or dax client
    this.items = tables[table]
    this.loader = new DataLoader(this.findByIds)
  }

  // replace with dynamoDB batch find function
  findByIds = (ids: string[]): Promise<Item[]> =>
    new Promise(resolve => {
      console.log(this.items)
      resolve(this.items.filter(({ id: itemId }) => ids.includes(itemId)))
    })

  // utility function for testing purpose, can be deleted if all services are connected to db
  getAllIds = () => this.items.map(({ id }) => id)
}
