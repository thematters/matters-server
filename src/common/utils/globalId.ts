import * as base64 from 'base-64'
import { NodeTypes } from 'definitions'

export const toGlobalId = ({
  type,
  id
}: {
  type: NodeTypes
  id: number | string
}) => base64.encode(`${type}:${id}`)

export const fromGlobalId = (globalId: string) => {
  const [type, id] = base64.decode(globalId).split(':')
  return { type, id }
}
