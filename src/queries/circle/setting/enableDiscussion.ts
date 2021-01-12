import { CircleSettingToEnableDiscussionResolver } from 'definitions'

const resolver: CircleSettingToEnableDiscussionResolver = async (
  { id },
  _,
  { viewer, dataSources: { atomService } }
) => {
  // TODO: feature flag of setting managment
  return true
}

export default resolver
