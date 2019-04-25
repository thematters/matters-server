# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2019-04-25

### Added

- Allow partner to edit collections #300

### Changed

- ElasticSearch optimization #285
- Remove comment mentioned user table and related scripts #293
- Fix empty string, false and 0 are deleted #296
- Fix content-encoding of S3 images #302

## [1.1.0] - 2019-04-20

### Added

- Collection APIs #283 #286 #287 #289
- Mention notification after publishing #288
- Migration script for producing collection data #273

### Changed

- Make all article public & search tags with ES #284
- Fix create duplicate notice #292
- Skip check email for "email_reset" type in sendVerificationCode mutation #291

## [1.0.5] - 2019-04-09

### Added

- Compress and resize images #267 #274
- DB: Create `collection` table #269
- DB: Alter `draft` schema for `collection` #269

### Changed

- DB: Alter schema for matters today #265
- Re-use uuid in asset key #268
- Fix upload file extension name #270
- Update upload limit to 5MB #271

## [1.0.4] - 2019-04-02

### Added

- Added an API for updating matters today #257

### Changed

- Add url support for singleFileUpload, used when user refer to external images #259
- Add "data-", "class" and iframe to XSS Whitelist #258
- Define S3 bucket using env variables #258

## [1.0.3] - 2019-03-28

### Added

- Monitor EB memory usage in CloudWatch

# [1.0.2] - 2019-03-25

### Changed

- Skip ES recommendation engine until it recovers #244
- Use recent readAt for read history #244
- Replace line break with space in summary #244
- Add iframe into xss white list #242
- Fix subscription `nodeEdited`

## [1.0.1] - 2019-03-21

### Added

- `User.status.role` #230
- Invitation related notices #234

### Changed

- Make state of newly registered user as onboarding #229 #237
- Fix email reseting content has no user data #232
- Fix duplication issue in tags, authors and hottest articles #233
- Fix bug with word count #233
- Prioritize viewer language setting over header #233
- Optimize summary generation #233
- Strip html tag and redundant spaces in content #235
- Check permission if viewer request to edit comment #238
