import type { ItemData, GQLMutationResolvers } from '#definitions/index.js'

import {
  ASSET_TYPE,
  AUDIT_LOG_ACTION,
  AUDIT_LOG_STATUS,
} from '#common/enums/index.js'
import {
  AssetNotFoundError,
  AuthenticationError,
  DisplayNameInvalidError,
  PasswordInvalidError,
  UserInputError,
} from '#common/errors.js'
import { getLogger, auditLog } from '#common/logger.js'
import {
  generatePasswordhash,
  isValidDisplayName,
  isValidPaymentPassword,
  setCookie,
} from '#common/utils/index.js'
import { cfsvc } from '#connectors/index.js'
import { has, isEmpty } from 'lodash'
import { v4 } from 'uuid'

const logger = getLogger('mutation-update-user-info')

const resolver: GQLMutationResolvers['updateUserInfo'] = async (
  _,
  { input },
  {
    viewer,
    dataSources: { systemService, notificationService, atomService },
    req,
    res,
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const updateParams: { [key: string]: any } = {
    ...(has(input, 'description') ? { description: input.description } : {}),
    ...(has(input, 'language') ? { language: input.language } : {}),
  }

  if (input.avatar) {
    const avatarAssetUUID = input.avatar
    let asset

    // upload image first if it's a valid URL
    let isAvatarUrl = false
    try {
      /* tslint:disable */
      new URL(input.avatar)
      isAvatarUrl = true
    } catch (err) {
      isAvatarUrl = false
    }
    if (isAvatarUrl) {
      const uuid = v4()

      let keyPath: string | undefined
      try {
        keyPath = await cfsvc.baseUploadFileByUrl(
          ASSET_TYPE.avatar,
          input.avatar,
          uuid
        )
      } catch (err) {
        logger.error(`baseServerSideUploadFile error:`, err)
        throw new UserInputError('Invalid avatar URL.')
      }
      if (keyPath) {
        const { id: entityTypeId } = await systemService.baseFindEntityTypeId(
          'user' // entityType
        )

        const assetItem: ItemData = {
          uuid,
          authorId: viewer.id,
          type: ASSET_TYPE.avatar,
          path: keyPath,
        }

        // insert a new uuid item
        asset = await systemService.findAssetOrCreateByPath(
          // keyPath,
          assetItem,
          entityTypeId,
          viewer.id // relatedEntityId
        )
      }
    } else {
      asset = await systemService.findAssetByUUID(avatarAssetUUID)
    }

    if (
      !asset ||
      asset.type !== ASSET_TYPE.avatar ||
      asset.authorId !== viewer.id
    ) {
      throw new AssetNotFoundError('avatar asset does not exists')
    }
    updateParams.avatar = asset.id
  }

  // check profile cover
  if (input.profileCover) {
    const asset = await systemService.findAssetByUUID(input.profileCover)
    if (
      !asset ||
      asset.type !== ASSET_TYPE.profileCover ||
      asset.authorId !== viewer.id
    ) {
      throw new AssetNotFoundError('profile cover asset does not exists')
    }
    updateParams.profileCover = asset.id
  } else if (input.profileCover === null) {
    updateParams.profileCover = null
  }

  // check user display name
  if (input.displayName) {
    if (!isValidDisplayName(input.displayName) && !viewer.hasRole('admin')) {
      auditLog({
        actorId: viewer.id,
        action: AUDIT_LOG_ACTION.updateDisplayName,
        oldValue: viewer.displayName,
        newValue: input.displayName,
        status: AUDIT_LOG_STATUS.failed,
        remark: 'invalid user display name',
      })
      throw new DisplayNameInvalidError('invalid user display name')
    }
    updateParams.displayName = input.displayName
  }

  // check user agree term
  if (input.agreeOn === true) {
    updateParams.agreeOn = new Date()
  }

  // check payment password
  if (input.paymentPassword) {
    if (viewer.paymentPasswordHash) {
      throw new UserInputError(
        'Payment password alraedy exists. To reset it, use `resetPassword` mutation.'
      )
    }

    if (!isValidPaymentPassword(input.paymentPassword)) {
      throw new PasswordInvalidError(
        'invalid payment password, should be 6 digits.'
      )
    }

    updateParams.paymentPasswordHash = await generatePasswordhash(
      input.paymentPassword
    )
  }

  // check payment pointer
  if (input.paymentPointer) {
    if (!input.paymentPointer.startsWith('$')) {
      throw new UserInputError('Payment pointer must start with `$`')
    } else {
      updateParams.paymentPointer = input.paymentPointer
    }
  }

  if (isEmpty(updateParams)) {
    throw new UserInputError('bad request')
  }

  // update user info to db and es
  const user = await atomService.update({
    table: 'user',
    where: { id: viewer.id },
    data: { updatedAt: new Date(), ...updateParams },
  })
  logger.info(`Updated id ${viewer.id} in "user"`)

  if (input.displayName && viewer.displayName !== input.displayName) {
    auditLog({
      actorId: viewer.id,
      action: AUDIT_LOG_ACTION.updateDisplayName,
      oldValue: viewer.displayName,
      newValue: input.displayName,
      status: AUDIT_LOG_STATUS.succeeded,
    })
  }

  // trigger notifications
  if (updateParams.paymentPasswordHash && user.email) {
    notificationService.mail.sendPayment({
      to: user.email,
      recipient: {
        displayName: viewer.displayName,
        userName: viewer.userName,
      },
      type: 'passwordSet',
      language: user.language,
    })
  }

  // set language cookie if needed
  if (updateParams.language) {
    setCookie({ req, res, user })
  }

  return user
}

export default resolver
