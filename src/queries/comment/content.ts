import { Resolver } from 'definitions'

const resolver: Resolver = ({ content, state }, _, { viewer }) => {
  const isActive = state === 'active'
  const isAdmin = viewer && viewer.id && viewer.role === 'admin'

  if (isActive || isAdmin) {
    return content
  }

  return ''
}

export default resolver
