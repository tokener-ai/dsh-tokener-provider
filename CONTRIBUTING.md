# Contributing

## Before you open a pull request

- Read the repository instructions and follow the issue and pull request templates.
- Run the same checks as CI, such as lint, format, and tests, before you open a pull request.
- Add real behavior proof at the affected entrypoint in the pull request. Include the command or action, observed result, and anything you did not test. Test, lint, or CI output alone is not behavior proof.
- Review the final change and complete the human review declaration yourself. An agent must not check it for you.
- Follow the repository's commit and trailer rules. Keep credentials, private configuration, and machine-specific paths out of the change.

## Publish a release

GitHub Actions publishes to npm when a maintainer pushes a `v*` tag.
Normal merges do not publish packages.
The tag must name a commit on `main` and match the version in `package.json`.
Use `X.Y.Z` for stable versions and `X.Y.Z-alpha.N`, `X.Y.Z-beta.N`, or `X.Y.Z-rc.N` for prereleases.

Before the first automated release, configure the package on npmjs.com:

1. Open `@tokener-ai/dsh-tokener-provider` → Settings → Trusted publishing → Add trusted publisher → GitHub Actions.
2. Set Organization or user to `tokener-ai` and Repository to `dsh-tokener-provider`.
3. Set Workflow filename to `release.yml` and leave Environment name empty.
4. Enable both Allow npm publish and Allow npm dist-tag.
5. Save the publisher and complete the first release within two days.

This workflow uses OIDC authentication and provenance without an `NPM_TOKEN` secret.
It publishes prereleases to `latest` until any stable version exists on npm, then updates `beta` in the same job.
After the first stable version, prereleases update only `beta`.
Stable releases update only `latest`.
Registry errors, duplicate versions on a first attempt, and attempts to move any affected tag backward stop publication.

For each release:

1. Update `package.json` in a pull request and merge it after review and required checks.
2. Fetch `origin/main` and select the merged release commit.
3. Create its tag, for example `git tag v0.1.0-beta.2 <commit>`.
4. Push only that tag with `git push origin v0.1.0-beta.2`.
5. Open Actions → Release and make sure that npm publication and the GitHub Release succeed.
6. Run `npm view @tokener-ai/dsh-tokener-provider dist-tags --json` and inspect the published version and provenance on npmjs.com.

The workflow runs the CI checks, rejects generated-file drift, and inspects the tarball before publication.
It creates a GitHub Release with generated notes only after npm publication and all channel updates succeed.
If only the GitHub Release job fails, rerun that failed job instead of the entire workflow.
If publication succeeds but a channel update fails, open the original run and select Re-run failed jobs.
The rerun rebuilds the tarball and compares its SHA-512 integrity with the published version.
Only an exact match permits the rerun to skip publication and complete the channel updates.
If the contents differ or a channel points to a newer version, recovery stops without registry writes.
After a lost success response, reruns require the registry version to exist and the rebuilt tarball to match it byte for byte.
Otherwise, recovery stops or npm rejects republication, and an authenticated maintainer must repair channels with `npm dist-tag add <package>@<version> <tag>`.
A published version cannot be replaced. Never move the release tag to different code to retry it.
If a published version is defective, deprecate it and publish a new version.
An authenticated maintainer can restore a dist-tag to a known good version with `npm dist-tag add <package>@<version> <tag>`.
