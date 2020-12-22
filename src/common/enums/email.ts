import { isProd } from 'common/environment'

const DEV_EMAIL_TEMPLATE_ID = {
  verificationCode: {
    zh_hant: 'd-250ba94c759948cbb2bd9f94089d13b8',
    zh_hans: 'd-92b184faf2aa48fb8645600f2540cfb4',
    en: 'd-250ba94c759948cbb2bd9f94089d13b8',
  },
  registerSuccess: {
    zh_hant: 'd-06a6075fefe54a0f96157f69a726e46e',
    zh_hans: 'd-0be942cd60ff4082b35ab836b60a728f',
    en: 'd-06a6075fefe54a0f96157f69a726e46e',
  },
  dailySummary: {
    zh_hant: 'd-805ccf4182244f59a5388b581df1eeab',
    zh_hans: 'd-e242f3e39f014279966e43425b208cbe',
    en: 'd-805ccf4182244f59a5388b581df1eeab',
  },
  userDeleted: {
    zh_hant: 'd-b370a6eddc394814959b49db1ba4cfec',
    zh_hans: 'd-9774a8882f914afaa43e2634a234762b',
    en: 'd-b370a6eddc394814959b49db1ba4cfec',
  },
  migrationSuccess: {
    zh_hant: 'd-a86e6f1c1fc24379b4b21244f111161b',
    zh_hans: 'd-c0b89ae6e8fe4eed8f05277853561976',
    en: 'd-a86e6f1c1fc24379b4b21244f111161b',
  },
  churn: {
    zh_hant: 'd-f2df8dd4f3e24c7981ec152ccf6eb2ec',
    zh_hans: 'd-0e2daefb95214cf9ad0f9cd0d2957636',
    en: 'd-f2df8dd4f3e24c7981ec152ccf6eb2ec',
  },
  payment: {
    zh_hant: 'd-dd77980e9ec1477f98259c7e9fb4fc28',
    zh_hans: 'd-9fea53d8838e44c4be4b93d26b8f2e9a',
    en: 'd-dd77980e9ec1477f98259c7e9fb4fc28',
  },
  adoptTag: {
    zh_hant: 'd-88b64da37a3240a2b240b5fbdf944661',
    zh_hans: 'd-2d9dda465f294e1e8a7e226a4165d0d9',
    en: 'd-88b64da37a3240a2b240b5fbdf944661',
  },
  assignAsTagEditor: {
    zh_hant: 'd-ea7389447e9d48549a7d0ad86b90fa9f',
    zh_hans: 'd-6fe4334692e2475dba68a135831f0f40',
    en: 'd-ea7389447e9d48549a7d0ad86b90fa9f',
  },
}

const PROD_EMAIL_TEMPLATE_ID = {
  verificationCode: {
    zh_hant: 'd-df196f90da7743f6900906fc18487953',
    zh_hans: 'd-f9373c61bdac43e1a24f221ceba4c61c',
    en: 'd-df196f90da7743f6900906fc18487953',
  },
  registerSuccess: {
    zh_hant: 'd-765b335a77d244438891a62f023b8c2e',
    zh_hans: 'd-30589f459aac4df1ab66e0f8af79fc4d',
    en: 'd-765b335a77d244438891a62f023b8c2e',
  },
  dailySummary: {
    zh_hant: 'd-4a5a938cdc0c4020a1e2feb67a553946',
    zh_hans: 'd-7f4276f1b32f48a4a51df90cbbb1447a',
    en: 'd-4a5a938cdc0c4020a1e2feb67a553946',
  },
  userDeleted: {
    zh_hant: 'd-231ada8640374adb9d79a0130480c801',
    zh_hans: 'd-cce84e261e0f4e47a2f1e2296b784230',
    en: 'd-231ada8640374adb9d79a0130480c801',
  },
  migrationSuccess: {
    zh_hant: 'd-47b788ce3754426fb2a6d3c80b9872eb',
    zh_hans: 'd-2e7d84cd2965426b80eafcfdcd18776c',
    en: 'd-47b788ce3754426fb2a6d3c80b9872eb',
  },
  churn: {
    zh_hant: 'd-0b1612857f9b474aba91679c8e0994d8',
    zh_hans: 'd-d397d5ae9264436bb1e65a202174e6a9',
    en: 'd-0b1612857f9b474aba91679c8e0994d8',
  },
  payment: {
    zh_hant: 'd-96ab5281c6bd419ebec20e8dbcbed427',
    zh_hans: 'd-b00c4b181721405ebcb9170b1f890075',
    en: 'd-96ab5281c6bd419ebec20e8dbcbed427',
  },
  adoptTag: {
    zh_hant: 'd-20e5e339130d49d79fce853577f689d3',
    zh_hans: 'd-6e8f11d55f3447fc9e4ab2f4aa13ff2f',
    en: 'd-20e5e339130d49d79fce853577f689d3',
  },
  assignAsTagEditor: {
    zh_hant: 'd-3dc33b89e89442fe8c25c51502c9f4d6',
    zh_hans: 'd-fba153b334af44cb9c1ecc3695eff9fc',
    en: 'd-3dc33b89e89442fe8c25c51502c9f4d6',
  },
}

export const EMAIL_TEMPLATE_ID = isProd
  ? PROD_EMAIL_TEMPLATE_ID
  : DEV_EMAIL_TEMPLATE_ID
