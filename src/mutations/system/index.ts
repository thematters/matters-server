import addBlockedSearchKeyword from './addBlockedSearchKeyword.js'
import deleteAnnouncements from './deleteAnnouncements.js'
import deleteBlockedSearchKeywords from './deleteBlockedSearchKeywords.js'
import directImageUpload from './directImageUpload.js'
import logRecord from './logRecord.js'
import putAnnouncement from './putAnnouncement.js'
import putIcymiTopic from './putIcymiTopic.js'
import putRemark from './putRemark.js'
import putRestrictedUsers from './putRestrictedUsers.js'
import putSkippedListItem from './putSkippedListItem.js'
import putUserFeatureFlags from './putUserFeatureFlags.js'
import reviewTopicChannelFeedback from './reviewTopicChannelFeedback.js'
import setAdStatus from './setAdStatus.js'
import setBoost from './setBoost.js'
import setFeature from './setFeature.js'
import setSpamStatus from './setSpamStatus.js'
import singleFileUpload from './singleFileUpload.js'
import submitReport from './submitReport.js'
import toggleSeedingUsers from './toggleSeedingUsers.js'

export default {
  Mutation: {
    singleFileUpload,
    directImageUpload,
    setBoost,
    putRemark,
    logRecord,
    putSkippedListItem,
    setFeature,
    toggleSeedingUsers,
    putAnnouncement,
    deleteAnnouncements,
    addBlockedSearchKeyword,
    deleteBlockedSearchKeywords,
    putRestrictedUsers,
    putUserFeatureFlags,
    submitReport,
    putIcymiTopic,
    setSpamStatus,
    setAdStatus,
    reviewTopicChannelFeedback,
  },
}
