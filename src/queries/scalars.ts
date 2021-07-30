import { DateTimeResolver } from 'graphql-scalars'
import * as GraphQLUpload from 'graphql-upload'

export default {
  DateTime: DateTimeResolver,
  Upload: GraphQLUpload,
}
