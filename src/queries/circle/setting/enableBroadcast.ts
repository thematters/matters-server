import { CircleSettingToEnableBroadcastResolver } from 'definitions'

const resolver: CircleSettingToEnableBroadcastResolver = async (
  { id },
  _,
  { viewer, dataSources: { atomService } }
) => {
  // TODO: feature flag of setting managment
  return true
}

export default resolver
