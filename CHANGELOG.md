# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
