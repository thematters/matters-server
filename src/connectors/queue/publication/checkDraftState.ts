import Bull from 'bull'
import { PUBLISH_STATE } from 'common/enums'
import { AtomService } from 'connectors/atomService'
import { PublishArticleData } from '../publication'

export class CheckDraftState {
  constructor(
    private readonly atomService: AtomService
  ) {
    //
  }

  async handle(job: Bull.Job<PublishArticleData>, done: Bull.DoneCallback): Promise<any> {
    const { draftId } = job.data

    const draft = await this.atomService.findUnique({
      table: 'draft',
      where: { id: draftId },
    })

    if (!draft || draft.publishState !== PUBLISH_STATE.pending) {
      await job.progress(100)

      done(null, `Draft ${draftId} isn't in pending state.`)

      return false
    }

    await job.progress(5)
  }
}
