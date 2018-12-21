import { Resolver } from 'definitions'

const resolver: Resolver = async ({ avatar }, _, { systemService }) => {
  return avatar ? systemService.findAssetUrl(avatar) : null
}

export default resolver
