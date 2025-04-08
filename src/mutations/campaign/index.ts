import applyCampaign from './applyCampaign.js'
import putWritingChallenge from './putWritingChallenge.js'
import removeCampaignArticles from './removeCampaignArticles.js'
import sendCampaignAnnouncement from './sendCampaignAnnouncement.js'
import toggleWritingChallengeFeaturedArticles from './toggleWritingChallengeFeaturedArticles.js'
import updateCampaignApplicationState from './updateCampaignApplicationState.js'

export default {
  Mutation: {
    applyCampaign,
    putWritingChallenge,
    updateCampaignApplicationState,
    toggleWritingChallengeFeaturedArticles,
    removeCampaignArticles,
    sendCampaignAnnouncement,
  },
}
