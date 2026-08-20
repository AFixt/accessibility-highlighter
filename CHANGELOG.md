# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.0.7](https://github.com/AFixt/accessibility-highlighter/compare/v1.0.6...v1.0.7) (2026-08-20)

### Bug Fixes

- **ci:** make the owasp job real — off the 1.1.0 tag, gated, and on prs ([e60f0b4](https://github.com/AFixt/accessibility-highlighter/commit/e60f0b4bbf60c77c61dfaa175587d595873f1fdc))
- **ci:** pin action refs in disabled workflow files too ([e6b9864](https://github.com/AFixt/accessibility-highlighter/commit/e6b986412105b93e6863d5a0474b3531e1c75ff0)), closes [AFixt/batch-scanner#44](https://github.com/AFixt/accessibility-highlighter/issues/44)
- **ci:** pin workflow actions to commit SHAs ([6fc86c5](https://github.com/AFixt/accessibility-highlighter/commit/6fc86c58519cdb7a875c387d6eec750639d5bd47)), closes [AFixt/batch-scanner#44](https://github.com/AFixt/accessibility-highlighter/issues/44)
- **ci:** remove all scheduled (cron) triggers from workflows ([b5645f1](https://github.com/AFixt/accessibility-highlighter/commit/b5645f1a6bf4909f397e7d78193b396c88059d97)), closes [#92](https://github.com/AFixt/accessibility-highlighter/issues/92)

### Documentation

- **ci:** correct the Dependabot alerts claim in the CI policy ([1f18dd3](https://github.com/AFixt/accessibility-highlighter/commit/1f18dd332795df533a804daffdd57a4149126b9d))
- **claude:** document the release flow and the main back-merge ([923b283](https://github.com/AFixt/accessibility-highlighter/commit/923b28300022010acb41f997711f01783bb10f20))

### [1.0.6](https://github.com/AFixt/accessibility-highlighter/compare/v1.0.5...v1.0.6) (2026-08-01)

### Bug Fixes

- **build:** stamp the extension version from package.json ([b4a895f](https://github.com/AFixt/accessibility-highlighter/commit/b4a895fa4372154f21839ac69d6843035024cd3d))
- **ci:** make the gitleaks and actionlint installs platform-aware ([6ab1550](https://github.com/AFixt/accessibility-highlighter/commit/6ab155099ce7331177023515373a8dbd4336fe3c))
- **ci:** probe the tool by running it before reusing it ([9b7b7ca](https://github.com/AFixt/accessibility-highlighter/commit/9b7b7ca99eeb793c31884d2400a0c9604f77951f))
- **deps:** resolve fixable npm audit advisories, document the rest ([79ee090](https://github.com/AFixt/accessibility-highlighter/commit/79ee09023cbea8a9241a5dd43052593a3a0dd4c0)), closes [#82](https://github.com/AFixt/accessibility-highlighter/issues/82) [#82](https://github.com/AFixt/accessibility-highlighter/issues/82)
- **docs:** repoint the repository and edge store links at real urls ([9bcd699](https://github.com/AFixt/accessibility-highlighter/commit/9bcd69941da89ab5150940c516b2684f679e3ba6))
- **lint:** skip gitignored files in lint:md ([39a5945](https://github.com/AFixt/accessibility-highlighter/commit/39a5945a2e807888a3bde88f3fdd928f62f57624)), closes [#83](https://github.com/AFixt/accessibility-highlighter/issues/83) [#83](https://github.com/AFixt/accessibility-highlighter/issues/83)
- **release:** point the changelog url templates at the real repository ([db84629](https://github.com/AFixt/accessibility-highlighter/commit/db84629e255a536fe152b58399a8c7736be6ed82))
- **scripts:** make a lychee failure actually fail the link check ([fbead5d](https://github.com/AFixt/accessibility-highlighter/commit/fbead5d1e38cce914bbea785facedbdf7b19db49))

### Documentation

- **adr:** record the advisory-range correction that cleared the audit ([bede806](https://github.com/AFixt/accessibility-highlighter/commit/bede806bb0993b256130516ad6ee22b056cfa17f)), closes [#83](https://github.com/AFixt/accessibility-highlighter/issues/83) [#82](https://github.com/AFixt/accessibility-highlighter/issues/82) [#84](https://github.com/AFixt/accessibility-highlighter/issues/84)
- **adr:** the residual audit findings are false positives ([58f6b2c](https://github.com/AFixt/accessibility-highlighter/commit/58f6b2ccc4a1f73ecac92b070da39f6c8d336e5e)), closes [#82](https://github.com/AFixt/accessibility-highlighter/issues/82)
