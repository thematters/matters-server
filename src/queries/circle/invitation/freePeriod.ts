import { InvitationToFreePeriodResolver } from 'definitions'

const resolver: InvitationToFreePeriodResolver = async (
  { durationInDays },
  _,
  { dataSources: { atomService } }
) => {
  // TODO: alter `freePeriod` input as day unit
  if (durationInDays && durationInDays >= 0) {
    return durationInDays / 30
  }

  return null
}

export default resolver
