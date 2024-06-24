import deleteJournal from './deleteJournal'
import { likeJournal, unlikeJournal } from './likeJournal'
import putJournal from './putJournal'

export default {
  Mutation: {
    putJournal,
    deleteJournal,
    likeJournal,
    unlikeJournal,
  },
}
