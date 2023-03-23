import lodash from 'lodash'
import { v4 } from 'uuid'

import { ASSET_TYPE } from 'common/enums/index.js'
import { imgCacheServicePrefix } from 'common/environment.js'
import {
  AssetNotFoundError,
  AuthenticationError,
  DisplayNameInvalidError,
  ForbiddenError,
  NameExistsError,
  NameInvalidError,
  PasswordInvalidError,
  UserInputError,
} from 'common/errors.js'
import logger from 'common/logger.js'
import {
  generatePasswordhash,
  isValidDisplayName,
  isValidPaymentPassword,
  isValidUserName,
  setCookie,
} from 'common/utils/index.js'
import { aws, cfsvc } from 'connectors/index.js'
import {
  GQLAssetType,
  ItemData,
  MutationToUpdateUserInfoResolver,
} from 'definitions'

const resolver: MutationToUpdateUserInfoResolver = async (
  _,
  { input },
  {
    viewer,
    dataSources: {
      userService,
      systemService,
      notificationService,
      atomService,
    },
    req,
    res,
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const updateParams: { [key: string]: any } = {
    ...(lodash.has(input, 'description')
      ? { description: input.description }
      : {}),
    ...(lodash.has(input, 'language') ? { language: input.language } : {}),
  }

  // check avatar
  if (input.avatar) {
    const avatarAssetUUID = input.avatar
    let asset

    if (input.avatar?.startsWith(imgCacheServicePrefix)) {
      const origUrl = input.avatar.substring(imgCacheServicePrefix.length + 1)

      const uuid = v4()

      let keyPath: string | undefined
      try {
        const [awsRes, cfsvcRes] = await Promise.allSettled([
          aws.baseServerSideUploadFile(GQLAssetType.imgCached, origUrl, uuid),
          cfsvc.baseServerSideUploadFile(GQLAssetType.imgCached, origUrl, uuid),
        ])
        if (awsRes.status !== 'fulfilled' || cfsvcRes.status !== 'fulfilled') {
          if (awsRes.status !== 'fulfilled') {
            console.error(
              new Date(),
              'aws s3 upload image ERROR:',
              awsRes.reason
            )
            throw awsRes.reason
          }
          if (cfsvcRes.status !== 'fulfilled') {
            console.error(
              new Date(),
              'cloudflare upload image ERROR:',
              cfsvcRes.reason
            )
            throw cfsvcRes.reason
          }
        }
        keyPath = awsRes.value
      } catch (err) {
        // ...
        console.error(`baseServerSideUploadFile error:`, err)
        throw err
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

  // check user name is editable
  if (input.userName) {
    const isUserNameEditable = await userService.isUserNameEditable(viewer.id)
    if (!isUserNameEditable) {
      throw new ForbiddenError('userName is not allow to edit')
    }
    if (!isValidUserName(input.userName)) {
      throw new NameInvalidError('invalid user name')
    }

    if (await userService.checkUserNameExists(input.userName)) {
      throw new NameExistsError('user name already exists')
    }
    updateParams.userName = input.userName
  }

  // check user display name
  if (input.displayName) {
    if (!isValidDisplayName(input.displayName) && !viewer.hasRole('admin')) {
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

  if (lodash.isEmpty(updateParams)) {
    throw new UserInputError('bad request')
  }

  // update user info to db and es
  const user = await atomService.update({
    table: 'user',
    where: { id: viewer.id },
    data: { updatedAt: new Date(), ...updateParams },
  })
  logger.info(`Updated id ${viewer.id} in "user"`)

  // add user name edit history
  if (input.userName) {
    await atomService.create({
      table: 'username_edit_history',
      data: {
        userId: viewer.id,
        previous: viewer.userName,
      },
    })
  }

  // update user info to es
  const { description, displayName, userName } = updateParams

  if (description || displayName || userName) {
    const searchable = lodash.omitBy(
      { description, displayName, userName },
      lodash.isNil
    )

    try {
      await atomService.es.client.update({
        index: 'user',
        id: viewer.id,
        body: {
          doc: searchable,
        },
      })
    } catch (err) {
      logger.error(err)
    }
  }

  // trigger notifications
  if (updateParams.paymentPasswordHash) {
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
