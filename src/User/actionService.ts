import { BaseService, Item } from 'src/connectors/baseService'

export type AppreciationAction = {
  userId: string
  action: string
  detail: number
  targetId: string
  timestamp: string
}
export type RatingAction = AppreciationAction

export class ActionService extends BaseService {
  // items = items
  constructor() {
    super('action')
  }

  // TODO: replaced by actual dynamoDB api
  // start of db calls ->

  findActionByTarget = (actionType: string, target: string): Promise<Item[]> =>
    new Promise(resolve =>
      resolve(
        this.items.filter(
          ({ action, targetId }) => action === actionType && targetId === target
        )
      )
    )

  findActionByTargets = (
    actionType: string,
    targets: string[]
  ): Promise<Item[]> => {
    return new Promise(resolve =>
      resolve(
        this.items.filter(
          ({ action, targetId }) =>
            action === actionType && targets.includes(targetId)
        )
      )
    )
  }

  findActionByUser = (actionType: string, userId: string): Promise<Item[]> =>
    new Promise(resolve =>
      resolve(
        this.items.filter(
          ({ action, userId: id }) => action === actionType && id === userId
        )
      )
    )

  countActionByTarget = (actionType: string, target: string) =>
    new Promise(resolve =>
      resolve(
        this.items.filter(
          ({ action, targetId }) => action === actionType && targetId === target
        ).length
      )
    )

  countActionByUser = (actionType: string, userId: string) =>
    new Promise(resolve =>
      resolve(
        this.items.filter(
          ({ action, userId: id }) => action === actionType && id === userId
        ).length
      )
    )

  // <- end of db calls
}
