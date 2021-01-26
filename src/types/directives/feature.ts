import { defaultFieldResolver, GraphQLField } from 'graphql'
import { SchemaDirectiveVisitor } from 'graphql-tools'

import { ForbiddenError } from 'common/errors'
import { isFeatureEnabled } from 'common/utils'

/**
 * This GQL directive is for checking feature is enabled or not.
 *
 * usage: @feature(name: "featue-name")
 */
export class FeatureDirective extends SchemaDirectiveVisitor {
  public visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field

    field.resolve = async (...args) => {
      const { name } = this.args
      const [
        root,
        _,
        {
          viewer,
          dataSources: { atomService },
        },
      ] = args

      // get state of the feature flag
      const feature = await atomService.findFirst({
        table: 'feature_flag',
        where: { name },
      })

      if (feature && !isFeatureEnabled(feature.flag, viewer)) {
        throw new ForbiddenError('viewer has no permission')
      }

      return resolve.apply(this, args)
    }
  }
}
