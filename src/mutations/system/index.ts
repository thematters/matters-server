import feedback from './feedback'
import logRecord from './logRecord'
import putRemark from './putRemark'
import putSkippedListItem from './putSkippedListItem'
import setBoost from './setBoost'
import singleFileDelete from './singleFileDelete'
import singleFileUpload from './singleFileUpload'
import setFeature from './setFeature'

export default {
  Mutation: {
    singleFileUpload,
    singleFileDelete,
    feedback,
    setBoost,
    putRemark,
    logRecord,
    putSkippedListItem,
    setFeature,
  },
}
