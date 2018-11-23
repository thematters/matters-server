import * as nr from 'newrelic'
import { log } from '../utils'

export function newrelic() {
  return function(target: any, propertyKey: string, descriptor: any) {
    if (descriptor === undefined) {
      descriptor = Object.getOwnPropertyDescriptor(target, propertyKey)
    }
    const originalMethod = descriptor.value
    descriptor.value = async function() {
      let tableName = ''
      if (arguments.length > 0 && arguments[0].hasOwnProperty('TableName')) {
        tableName = `:${arguments[0]['TableName']}`
      }
      const startAt = Date.now()
      log(`db:${propertyKey}${tableName}, start, ${startAt}`)

      const result = await nr.startSegment(
        `db:${propertyKey}${tableName}`,
        true,
        async () => {
          return await originalMethod.apply(this, arguments)
        }
      )

      const endAt = Date.now()
      log(`db:${propertyKey}${tableName}, end, ${endAt}`)
      log(
        `db:${propertyKey}${tableName}, duration, ${endAt - startAt}`
      )
      return result
    }
    return descriptor
  }
}
