import * as Base64 from 'js-base64'

import { NODE_TYPES } from 'common/enums/index.js'
import { UserInputError } from 'common/errors.js'

export const toGlobalId = ({
  type,
  id,
}: {
  type: NODE_TYPES
  id: number | string
}) => Base64.encodeURI(`${type}:${id}`)

export const fromGlobalId = (globalId: string) => {
  const [type, id] = Base64.decode(globalId).split(':')

  if (!id) {
    throw new UserInputError('invalid globalId')
  }
  return { type: type as NODE_TYPES, id }
}
