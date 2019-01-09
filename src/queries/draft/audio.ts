import { AudiodraftToAudioResolver } from 'definitions'

const resolver: AudiodraftToAudioResolver = async (
  { audio },
  _,
  { dataSources: { systemService } }
) => {
  return audio ? systemService.findAssetUrl(audio) : null
}

export default resolver
