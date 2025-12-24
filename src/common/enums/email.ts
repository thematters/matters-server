import { isProd } from '#common/environment.js'

export const CHANGE_EMAIL_TIMES_LIMIT_PER_DAY = 3
export const CHANGE_EMAIL_COUNTER_KEY_PREFIX = 'change-email-counter'

const DEV_EMAIL_TEMPLATE_ID = {
  verificationCode: {
    zh_hant: 'd-a3f5decf7e1a402c8f929df3ac9c0760',
    zh_hans: 'd-4b3f3aad36c148faa4370e00d992052e',
    en: 'd-a3f5decf7e1a402c8f929df3ac9c0760',
  },
  registerSuccess: {
    zh_hant: 'd-afaf751ebcac49e98e82b2aa061eea04',
    zh_hans: 'd-b56f8e941fbc43c4a129d652bf59d26b',
    en: 'd-afaf751ebcac49e98e82b2aa061eea04',
  },
  userDeleted: {
    zh_hant: 'd-b692e304e7e44efc9acefd74467b1def',
    zh_hans: 'd-ed486801cb274a2e9b57e103de6dd777',
    en: 'd-b692e304e7e44efc9acefd74467b1def',
  },
  migrationSuccess: {
    zh_hant: 'd-dfa5c65af9544750a2a9f24889f733c2',
    zh_hans: 'd-ccab86e903f44b62b5a4ddc432c8cfed',
    en: 'd-dfa5c65af9544750a2a9f24889f733c2',
  },
  payment: {
    zh_hant: 'd-5ba934f56f644888a457b03c4528a17a',
    zh_hans: 'd-42b8a820afd5430ea103ea96b8db107e',
    en: 'd-5ba934f56f644888a457b03c4528a17a',
  },
  adoptTag: {
    zh_hant: 'd-d16cef09ebdd408db1fa246097fbf755',
    zh_hans: 'd-fc6bda88521d406e9a1702e8139ea551',
    en: 'd-d16cef09ebdd408db1fa246097fbf755',
  },
  assignAsTagEditor: {
    zh_hant: 'd-edb212fac34b421f8ac33b31e49d9b42',
    zh_hans: 'd-9d920cb5f28c49cc9274296e17a01c1a',
    en: 'd-edb212fac34b421f8ac33b31e49d9b42',
  },
  circleInvitation: {
    zh_hant: 'd-6318c4b87fba4e6aa85ebce34891102d',
    zh_hans: 'd-b0db4625f09f49c9aab49d6fc1a7cc62',
    en: 'd-6318c4b87fba4e6aa85ebce34891102d',
  },
  emailChange: {
    zh_hant: 'd-a066211b9e1240f1a15b28def291b2f4',
    zh_hans: 'd-38b1286c9cd141f4a7d3328ea59b1d7d',
    en: 'd-a066211b9e1240f1a15b28def291b2f4',
  },
}

const PROD_EMAIL_TEMPLATE_ID = {
  verificationCode: {
    zh_hant: 'd-1ff6f3a732fb4d5c8dd80b6e1a04254d',
    zh_hans: 'd-c0fc5c93eab54bf787589e92a669e99c',
    en: 'd-1ff6f3a732fb4d5c8dd80b6e1a04254d',
  },
  registerSuccess: {
    zh_hant: 'd-3dcf611ba3c54b9a93e55d058b0466f4',
    zh_hans: 'd-a6fd21a85d06442d8f91f2533cb84b35',
    en: 'd-3dcf611ba3c54b9a93e55d058b0466f4',
  },
  userDeleted: {
    zh_hant: 'd-4ccc229e825c4914963776d313408075',
    zh_hans: 'd-e91201cd3b74425dbf54e775959602bc',
    en: 'd-4ccc229e825c4914963776d313408075',
  },
  migrationSuccess: {
    zh_hant: 'd-2283f0b9ac944293aa0b7f9a73994706',
    zh_hans: 'd-f87c47b1c5f04a4fa8a5f40e43a2880e',
    en: 'd-2283f0b9ac944293aa0b7f9a73994706',
  },
  payment: {
    zh_hant: 'd-d33821dd294d4c168581d0614002fe12',
    zh_hans: 'd-62f1d9378c7c4b95bdcdfe2d00849770',
    en: 'd-d33821dd294d4c168581d0614002fe12',
  },
  adoptTag: {
    zh_hant: 'd-908c71d6c0b5462bae032b47f5a9933f',
    zh_hans: 'd-67d46f077cb3454ea2501b90b02b0f7e',
    en: 'd-908c71d6c0b5462bae032b47f5a9933f',
  },
  assignAsTagEditor: {
    zh_hant: 'd-e925af9b55674f2e84442c1e9897c5c6',
    zh_hans: 'd-9b4824514b704679a344410d6f466308',
    en: 'd-e925af9b55674f2e84442c1e9897c5c6',
  },
  circleInvitation: {
    zh_hant: 'd-f1ddf65dbf2d4fbabe3994e5c2187beb',
    zh_hans: 'd-67a84b674fd74ccca53bb807c4f04557',
    en: 'd-f1ddf65dbf2d4fbabe3994e5c2187beb',
  },
  emailChange: {
    zh_hant: 'd-2011e60c53e94a1c94bcb8d9c1545944',
    zh_hans: 'd-b2e64ec8a843468aa1e3d3d11ba546a4',
    en: 'd-2011e60c53e94a1c94bcb8d9c1545944',
  },
}

export const EMAIL_TEMPLATE_ID = isProd
  ? PROD_EMAIL_TEMPLATE_ID
  : DEV_EMAIL_TEMPLATE_ID
