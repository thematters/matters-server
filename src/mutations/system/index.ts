import feedback from './feedback'
import logRecord from './logRecord'
import putRemark from './putRemark'
import putSkippedListItem from './putSkippedListItem'
import setBoost from './setBoost'
import setFeatureFlag from './setFeatureFlag'
import singleFileDelete from './singleFileDelete'
import singleFileUpload from './singleFileUpload'

export default {
  Mutation: {
    singleFileUpload,
    singleFileDelete,
    feedback,
    setBoost,
    putRemark,
    logRecord,
    putSkippedListItem,
    setFeatureFlag,
  },
}
