import { BaseService } from '../connectors/baseService'
import { resolve } from 'path'

export class ActionService extends BaseService {
  // items = items
  constructor() {
    super('action')
  }

  // TODO: replaced by actual dynamoDB api
  // start of db calls ->

  findActionByTarget = (actionType: string, target: string) =>
    new Promise(resolve =>
      resolve(
        this.items.filter(
          ({ action, targetId }) => action === actionType && targetId === target
        )
      )
    )

  findActionByUser = (actionType: string, userId: string) =>
    new Promise(resolve =>
      resolve(
        this.items.filter(
          ({ action, userId: id }) => action === actionType && id === userId
        )
      )
    )

  // <- end of db calls
}
