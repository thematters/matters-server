import { environment } from 'common/environment'
import { Manager, TranslationConfig } from 'connectors/translation/manager'

const config: TranslationConfig = {
  // --------------------------------------------------------------------
  // Default Driver
  // --------------------------------------------------------------------
  //
  // Define the default driver to use when one is not specified in the
  // "translator" API. The driver must either be set in the drivers
  // config, or manually added to the global translation manager.

  default: environment.translationDefault ?? 'null',

  // --------------------------------------------------------------------
  // Translation Drivers
  // --------------------------------------------------------------------
  //
  // A list of translation drivers we can use in the application. It
  // gives us the flexibility to switch between different drivers
  // with the translator API for various use cases more easily.
  //
  // Supported drivers: "google" | "null"

  drivers: {
    google: {
      driver: 'google',
      projectId: environment.translationGoogleProjectId,
      keyFilename: environment.translationGoogleKeyFile,
    },

    null: {
      driver: 'null',
    },
  },
}

export function configureTranslation() {
  new Manager(config).asGlobal()
}
