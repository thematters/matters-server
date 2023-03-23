import addBlockedSearchKeyword from './addBlockedSearchKeyword.js'
import deleteAnnouncements from './deleteAnnouncements.js'
import deleteBlockedSearchKeywords from './deleteBlockedSearchKeywords.js'
import logRecord from './logRecord.js'
import putAnnouncement from './putAnnouncement.js'
import putRemark from './putRemark.js'
import putSkippedListItem from './putSkippedListItem.js'
import setBoost from './setBoost.js'
import setFeature from './setFeature.js'
import singleFileUpload from './singleFileUpload.js'
import toggleSeedingUsers from './toggleSeedingUsers.js'

export default {
  Mutation: {
    singleFileUpload,
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
  },
}
