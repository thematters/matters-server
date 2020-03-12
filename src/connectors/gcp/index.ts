import { v2 as TranslateAPI } from '@google-cloud/translate'

import { environment } from 'common/environment'

class GCP {
  translate: TranslateAPI.Translate

  constructor() {
    this.translate = new TranslateAPI.Translate({
      projectId: environment.gcpProjectId,
      keyFilename: environment.translateCertPath
    })
  }
}

export const gcp = new GCP()
