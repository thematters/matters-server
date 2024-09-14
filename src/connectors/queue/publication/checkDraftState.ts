import { PUBLISH_STATE } from 'common/enums'
import { AtomService } from 'connectors/atomService'
import { PublishArticleData } from '../publication'
import { ChainedJob } from './job'

export class CheckDraftState extends ChainedJob<PublishArticleData> {
  constructor(
    private readonly atomService: AtomService
  ) {
    super()
  }

  async handle(): Promise<any> {
    const { draftId } = this.job.data

    const draft = await this.atomService.findUnique({
      table: 'draft',
      where: { id: draftId },
    })

    if (!draft || draft.publishState !== PUBLISH_STATE.pending) {
      await this.job.progress(100)

      this.done(null, `Draft ${draftId} isn't in pending state.`)

      return false
    }

    await this.job.progress(5)
  }
}
