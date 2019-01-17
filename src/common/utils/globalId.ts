import { Base64 } from 'js-base64'

export const toGlobalId = ({
  type,
  id
}: {
  type: string
  id: number | string
}) => Base64.encodeURI(`${type}:${id}`)

export const fromGlobalId = (globalId: string) => {
  const [type, id] = Base64.decode(globalId).split(':')
  return { type, id }
}
