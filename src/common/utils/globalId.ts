import { Base64 } from 'js-base64'

import { UserInputError } from 'common/errors'

export const toGlobalId = ({
  type,
  id,
}: {
  type:
    | 'Article'
    | 'Comment'
    | 'User'
    | 'Tag'
    | 'Draft'
    | 'SkippedListItem'
    | 'Transaction'
  id: number | string
}) => Base64.encodeURI(`${type}:${id}`)

export const fromGlobalId = (globalId: string) => {
  const [type, id] = Base64.decode(globalId).split(':')

  if (!id) {
    throw new UserInputError('invalid globalId')
  }
  return { type, id }
}
