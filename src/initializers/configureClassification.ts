import { environment } from 'common/environment'
import {
  ClassificationManagerConfig,
  Manager,
} from 'connectors/classification/manager'

export function configureClassification() {
  const config: ClassificationManagerConfig = {
    // --------------------------------------------------------------------
    // Default Driver
    // --------------------------------------------------------------------
    //
    // Specify the default classification driver to use when one is not
    // specified in the "classifier" API. The driver must either be
    // set in the drivers config, or added to the global manager.

    default: environment.classificationDefault || 'null',

    // --------------------------------------------------------------------
    // Classification Drivers
    // --------------------------------------------------------------------
    //
    // Define a list of classification drivers that we can use in the
    // application. The "classifier" API makes it simple to switch
    // between different drivers to accommodate different cases.
    //
    // Supported drivers: "gemini" | "null"

    drivers: {
      gemini: {
        driver: 'gemini',
        project: environment.classificationGeminiProject,
        location: environment.classificationGeminiLocation,
        model: environment.classificationGeminiModel,
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
