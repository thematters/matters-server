import type { GQLMutationResolvers } from 'definitions'

import {
  MINUTE,
  VERIFICATION_CODE_EXPIRED_AFTER,
  SKIPPED_LIST_ITEM_TYPES,
  VERIFICATION_CODE_PROTECTED_TYPES,
  VERIFICATION_DOMAIN_WHITELIST,
  VERIFICATION_CODE_TYPE,
} from 'common/enums'
import { isDev } from 'common/environment'
import {
  AuthenticationError,
  EmailExistsError,
  ForbiddenError,
  EmailNotFoundError,
  UserInputError,
} from 'common/errors'
import { getLogger } from 'common/logger'
import { extractRootDomain } from 'common/utils'
import { GCP } from 'connectors'

const logger = getLogger('mutation-send-verificaiton-code')

const resolver: GQLMutationResolvers['sendVerificationCode'] = async (
  _,
  { input: { email: rawEmail, type, token, redirectUrl } },
  { viewer, dataSources: { userService, notificationService, systemService } }
) => {
  const email = rawEmail.toLowerCase()

  if (!viewer.id && VERIFICATION_CODE_PROTECTED_TYPES.includes(type)) {
    throw new AuthenticationError(
      `visitor cannot send verification code of ${type}`
    )
  }

  let user

  // register check
  if (type === VERIFICATION_CODE_TYPE.register) {
    // check email
    user = await userService.findByEmail(email)
    if (user) {
      throw new EmailExistsError('email has been registered')
    }

    // check token for Turing test
    const gcp = new GCP()
    const isHuman = await gcp.recaptcha({ token, ip: viewer.ip })
    if (!isHuman) {
      throw new ForbiddenError('registration via scripting is not allowed')
    }
  }

  if (
    type === VERIFICATION_CODE_TYPE.payment_password_reset ||
    type === VERIFICATION_CODE_TYPE.password_reset ||
    type === VERIFICATION_CODE_TYPE.email_reset ||
    type === VERIFICATION_CODE_TYPE.email_verify
  ) {
    user = await userService.findByEmail(email)
    if (!user) {
      throw new EmailNotFoundError('cannot find email')
    }
  }

  // check redirectUrl
  if (redirectUrl) {
    const tld = extractRootDomain(redirectUrl)

    if (!tld || !VERIFICATION_DOMAIN_WHITELIST.includes(tld)) {
      throw new UserInputError('"redirectUrl" is invalid.')
    }
  }

  const { agentHash } = viewer
  const {
    AGENT_HASH: TYPE_HASH,
    EMAIL: TYPE_EMAIL,
    DOMAIN: TYPE_DOMAIN,
  } = SKIPPED_LIST_ITEM_TYPES

  const feature = await systemService.getFeatureFlag('fingerprint')
  const isFingerprintEnabled =
    feature && (await systemService.isFeatureEnabled(feature.flag, viewer))

  // verify email if it's in blocklist
  const banEmail = await systemService.findSkippedItem(TYPE_EMAIL, email)
  if (banEmail && banEmail.archived === false) {
    if (agentHash) {
      await systemService.createSkippedItem({
        type: TYPE_HASH,
        uuid: banEmail.uuid,
        value: agentHash,
      })
    }
    logger.warn(`email ${email} is in blocklist`)

    if (isFingerprintEnabled) {
      return true
    }
  }

  // verify email doamin if it's in blocklist
  const domain = email.split('@')[1]
  const banDomain = await systemService.findSkippedItem(TYPE_DOMAIN, domain)
  if (banDomain && banDomain.archived === false) {
    logger.warn(`domain ${domain} is in blocklist`)
    return true
  }

  // verify agent hash if it's in blocklist
  if (agentHash) {
    const banAgentHash = await systemService.findSkippedItem(
      TYPE_HASH,
      agentHash
    )
    if (banAgentHash && banAgentHash.archived === false) {
      await systemService.createSkippedItem({
        type: TYPE_EMAIL,
        uuid: banAgentHash.uuid,
        value: email,
      })
      logger.warn(`agent hash ${agentHash} is in blocklist`)

      if (isFingerprintEnabled) {
        return true
      }
    }
  }

  // insert record
  const emailOtpExpire = new Date(
    Date.now() + (isDev ? MINUTE : VERIFICATION_CODE_EXPIRED_AFTER)
  )
  const { code } = await userService.createVerificationCode({
    userId: viewer.id,
    email,
    type,
    strong: !!redirectUrl, // strong random code for link
    expiredAt: type === 'email_otp' ? emailOtpExpire : undefined,
  })

  // send verification email
  notificationService.mail.sendVerificationCode({
    to: email,
    type,
    code,
    redirectUrl,
    recipient: {
      displayName: (user && user.displayName) ?? null,
    },
    language: viewer.language,
  })

  return true
}

export default resolver
