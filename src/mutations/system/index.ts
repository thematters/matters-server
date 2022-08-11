import addBlockedSearchKeyword from './addBlockedSearchKeyword'
import deleteAnnouncements from './deleteAnnouncements'
import deleteBlockedSearchKeywords from './deleteBlockedSearchKeywords'
import logRecord from './logRecord'
import putAnnouncement from './putAnnouncement'
import putRemark from './putRemark'
import putSkippedListItem from './putSkippedListItem'
import setBoost from './setBoost'
import setFeature from './setFeature'
import singleFileUpload from './singleFileUpload'
import toggleSeedingUsers from './toggleSeedingUsers'

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
