import { CacheScope } from 'apollo-cache-control'
import { Context } from 'definitions'
import { GraphQLResolveInfo } from 'graphql'

export const cacheControlViewer = async (
  { id }: any,
  _: any,
  { viewer }: Context,
  { cacheControl }: GraphQLResolveInfo
) => {
  if (viewer.id === id && cacheControl) {
    cacheControl.setCacheHint({ scope: CacheScope.Private })
  }
}
