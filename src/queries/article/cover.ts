import { Resolver } from 'definitions'

const resolver: Resolver = async ({ cover }, _, { systemService }) => {
  return cover ? systemService.findAssetUrl(cover) : null
}

export default resolver
