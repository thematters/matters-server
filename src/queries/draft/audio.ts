import { Resolver } from 'definitions'

const resolver: Resolver = async ({ audio }, _, { systemService }) => {
  return audio ? systemService.findAssetUrl(audio) : null
}

export default resolver
