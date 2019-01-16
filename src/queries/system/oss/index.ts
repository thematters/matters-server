import { Context } from 'definitions'

export * from './users'
export * from './articles'
export * from './tags'
export * from './reports'
export * from './report'

export const rootOSS = (_: any, __: any, { viewer }: Context) => {
  if (!viewer.id) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  if (viewer.role !== 'admin') {
    throw new Error('only admin can do this') // TODO
  }

  return true
}
