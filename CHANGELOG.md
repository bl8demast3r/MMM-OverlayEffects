# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- April Fools' Day mirrored screen effect: on April 1 the whole mirror is flipped horizontally (`forceEffect: "mirrored"`, `enabledEffects.mirrored`).
- Crawling spider for the October effect: a spider crawls across the screen every 20–60 s along a random, wandering path. New `spiderwebs` options: `crawlingSpider`, `crawlDelayMin`, `crawlDelayMax`, `crawlSpeed`, `crawlerSize`.
- Screenshots in the README.
- ESLint configuration with `npm run lint` and `npm run lint:fix` scripts.
- Dependabot configuration, CHANGELOG and CODE_OF_CONDUCT.

### Fixed

- The hanging spider's thread now extends above the top of the screen, so its end is never visible while the spider bobs down.
- Spider webs now reach the screen edges on displays under about 800px tall, where they used to sit slightly inset.

## [1.0.0] - 2026-10-04

### Added

- Initial release: fullscreen holiday and seasonal overlay effects (spider webs, snow, fireworks, hearts, confetti, clovers, turkeys and Santas), scheduled by date with config and notification overrides.

[Unreleased]: https://github.com/bl8demast3r/MMM-OverlayEffects/compare/39f1be9...HEAD
[1.0.0]: https://github.com/bl8demast3r/MMM-OverlayEffects/commit/39f1be9
