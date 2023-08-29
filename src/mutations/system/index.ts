import addBlockedSearchKeyword from './addBlockedSearchKeyword'
import deleteAnnouncements from './deleteAnnouncements'
import deleteBlockedSearchKeywords from './deleteBlockedSearchKeywords'
import directImageUpload from './directImageUpload'
import logRecord from './logRecord'
import putAnnouncement from './putAnnouncement'
import putRemark from './putRemark'
import putRestrictedUsers from './putRestrictedUsers'
import putSkippedListItem from './putSkippedListItem'
import setBoost from './setBoost'
import setFeature from './setFeature'
import singleFileUpload from './singleFileUpload'
import toggleSeedingUsers from './toggleSeedingUsers'

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
  },
}
