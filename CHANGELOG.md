# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.15.3](https://github.com/Farfetch/garment/compare/v0.15.0...v0.15.3) (2021-03-22)


### Bug Fixes

* Version ([060ebbe](https://github.com/Farfetch/garment/commit/060ebbef5435c21f6ed3855dd3fb66745ec1126e))





# [0.15.0](https://github.com/Farfetch/garment/compare/v0.14.6...v0.15.0) (2021-03-19)


### Features

* Add workspaceDir to runner-bin ([#43](https://github.com/Farfetch/garment/issues/43)) ([8690473](https://github.com/Farfetch/garment/commit/8690473d3b4d2b4251ec45e02f6ffd71a12e54dc))





## [0.14.6](https://github.com/Farfetch/garment/compare/v0.14.5...v0.14.6) (2021-03-08)


### Bug Fixes

* [#40](https://github.com/Farfetch/garment/issues/40) batch error should result in exitcode 1 ([#41](https://github.com/Farfetch/garment/issues/41)) ([8ff81d8](https://github.com/Farfetch/garment/commit/8ff81d8c1c8f9d81825e2f68a1f2cc1cb6a9f5fe))





## [0.14.5](https://github.com/Farfetch/garment/compare/v0.14.4...v0.14.5) (2021-03-03)


### Bug Fixes

* Critical getActionGraph bug ([9e2e54b](https://github.com/Farfetch/garment/commit/9e2e54bbcd41b1518bcdbf62e4ef1bbd17400ae3))





## [0.14.4](https://github.com/Farfetch/garment/compare/v0.14.3...v0.14.4) (2021-02-18)


### Bug Fixes

* Files flag [#37](https://github.com/Farfetch/garment/issues/37) ([#38](https://github.com/Farfetch/garment/issues/38)) ([95b4db8](https://github.com/Farfetch/garment/commit/95b4db83cbfae4688712d29796a2759695d3876b))





## [0.14.3](https://github.com/Farfetch/garment/compare/v0.14.2...v0.14.3) (2021-02-12)


### Bug Fixes

* Invoke destroy handler in batch mode ([#32](https://github.com/Farfetch/garment/issues/32)) ([132c6fc](https://github.com/Farfetch/garment/commit/132c6fce87248efe1f1a9492f4afa897e6d0e0cc))





## [0.14.2](https://github.com/Farfetch/garment/compare/v0.14.1...v0.14.2) (2021-02-04)

**Note:** Version bump only for package garment





## [0.14.1](https://github.com/Farfetch/garment/compare/v0.14.0...v0.14.1) (2021-01-22)


### Bug Fixes

* Error for rootDir only when necessary ([#29](https://github.com/Farfetch/garment/issues/29)) ([a16a853](https://github.com/Farfetch/garment/commit/a16a85310329338fa51f1f36afe8e0f2e7702245))
* Missing root tsconfig ([27fa8bf](https://github.com/Farfetch/garment/commit/27fa8bf39d87d6a34ec4e6108e1c64336d07015a))
* Workspace path match ([#33](https://github.com/Farfetch/garment/issues/33)) ([a1a5c06](https://github.com/Farfetch/garment/commit/a1a5c06bb6ccdb67645f4a8fc4d349c7b11dd85c))





# [0.14.0](https://github.com/Farfetch/garment/compare/v0.13.14...v0.14.0) (2020-12-15)


### Features

* Improve cache subscriptions ([#27](https://github.com/Farfetch/garment/issues/27)) ([77bb25a](https://github.com/Farfetch/garment/commit/77bb25acf000319efb05d6e76417aad256042fb6))





## [0.13.14](https://github.com/Farfetch/garment/compare/v0.13.13...v0.13.14) (2020-12-07)


### Bug Fixes

* Error for non-existant rootDir should not throw for virtual fs ([#23](https://github.com/Farfetch/garment/issues/23)) ([dc9cc65](https://github.com/Farfetch/garment/commit/dc9cc651eb270a0272cd786a28c1d303664f5c60))
* Watch mode not working on Windows ([#26](https://github.com/Farfetch/garment/issues/26)) ([1967429](https://github.com/Farfetch/garment/commit/196742931dba8d607cbce7f7446bee0b14c912c7))





## [0.13.13](https://github.com/Farfetch/garment/compare/v0.13.12...v0.13.13) (2020-09-29)


### Bug Fixes

* Clarify error message when non-magical part of input glob does not exist ([#21](https://github.com/Farfetch/garment/issues/21)) ([2b92c62](https://github.com/Farfetch/garment/commit/2b92c62bbb67c87309a0ff265294d3bd1b6ecc64))





## [0.13.12](https://github.com/Farfetch/garment/compare/v0.13.11...v0.13.12) (2020-09-16)


### Bug Fixes

* Runner build if it's a part of the project ([f4c8b42](https://github.com/Farfetch/garment/commit/f4c8b42f345f31dcc909d282fac22f55874c05e8))





## [0.13.11](https://github.com/Farfetch/garment/compare/v0.13.10...v0.13.11) (2020-09-14)


### Bug Fixes

* Process peer dependencies ([#18](https://github.com/Farfetch/garment/issues/18)) ([7ed61fd](https://github.com/Farfetch/garment/commit/7ed61fdc0b9a7050251992f26b5f20695c4f5c57))
* Wrong baseDir in a watch mode ([#19](https://github.com/Farfetch/garment/issues/19)) ([95893ec](https://github.com/Farfetch/garment/commit/95893ec7f5f2ad9b469ca746e66dee595ce49ec1))





## [0.13.10](https://github.com/Farfetch/garment/compare/v0.13.9...v0.13.10) (2020-09-01)


### Bug Fixes

* **runner-ts:** Add path to the cacheKeys to fix [#14](https://github.com/Farfetch/garment/issues/14) ([#15](https://github.com/Farfetch/garment/issues/15)) ([38f3151](https://github.com/Farfetch/garment/commit/38f3151d27a0fa0aff51464ca36c5870485da8e9))
* Correct unit tests failing on Windows ([#9](https://github.com/Farfetch/garment/issues/9)) ([fad401d](https://github.com/Farfetch/garment/commit/fad401d822672882dfc550f8185acbc698a4a6be))





## [0.13.9](https://github.com/Farfetch/garment/compare/v0.13.8...v0.13.9) (2020-07-28)


### Bug Fixes

* Read files even if they have a leading dot ([#5](https://github.com/Farfetch/garment/issues/5)) ([3f04be0](https://github.com/Farfetch/garment/commit/3f04be0c50ceb2469e838f61b390664e53663cd7))
* Update notifier [#6](https://github.com/Farfetch/garment/issues/6) ([#8](https://github.com/Farfetch/garment/issues/8)) ([55be2a9](https://github.com/Farfetch/garment/commit/55be2a99c2af6f10e894ee82df6b70a89250fe11))





## 0.13.8 (2020-07-15)


### Bug Fixes

* Babel runner picks wrong config ([#1](https://github.com/Farfetch/garment/issues/1)) ([043bb85](https://github.com/Farfetch/garment/commit/043bb85acdd82a5f9981adedaf6bbcf97f31f632))





## 0.13.7 (2020-07-08)



## 0.13.5 (2020-07-07)

**Note:** Version bump only for package garment





## 0.13.6 (2020-07-08)



## 0.13.5 (2020-07-07)

**Note:** Version bump only for package garment
