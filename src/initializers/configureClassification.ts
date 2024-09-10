import { environment } from 'common/environment'
import { ClassificationManagerConfig, Manager } from 'connectors/classification/manager'

export function configureClassification() {
  const config: ClassificationManagerConfig = {
    default: environment.classificationDefault || 'null',
    drivers: {
      gemini: {
        driver: 'gemini',
        project: environment.classificationGeminiProject,
        location: environment.classificationGeminiLocation,
        googleAuthOptions: {
          keyFile: environment.classificationGeminiKeyFile,
        },
      },
      null: {
        driver: 'null',
      },
    },
  }

  new Manager(config).asGlobal()
}
