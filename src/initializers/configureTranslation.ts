import { environment } from 'common/environment'
import { Manager, TranslationConfig } from 'connectors/translation/manager'

const config: TranslationConfig = {
  default: environment.translationDefault ?? 'null',
  drivers: {
    google: {
      driver: 'google',
      projectId: environment.translationGoogleProjectId,
      keyFilename: environment.translationGoogleKeyFile,
    },
    null: {
      driver: 'null',
    },
  }
}

export default function configureTranslation() {
  new Manager(config).asGlobal()
}
