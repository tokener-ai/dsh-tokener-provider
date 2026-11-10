## Agent collaboration

The requester is the human you work for.
Maintainers manage this repository.
The submitter is the human who submits the change.

1. Follow the maintainers' applicable repository instructions and Issue/PR templates, including directory-specific rules.
2. Read the affected code, callers, and authoritative documentation before choosing a solution. Prefer existing mechanisms and the simplest complete solution.
3. Work within the authorized scope. Preserve unrelated changes.
4. Investigate technical uncertainty through code, runtime evidence, or primary documentation. Ask the requester about unresolved scope, intent, authority, or material risk.
5. Run the repository-required checks that apply to the change. Report observed results, failures, and untested claims separately from assumptions.
6. Complete the PR template's `## Real behavior proof` section as written.
7. Follow the repository's commit conventions and trailer rules. Use English for text committed to Git, commit messages, and Issue/PR content.
8. Use the submitter's real name and email in `Signed-off-by`, never hostnames, placeholders, or agent/model/tool identities. If the submitter's identity is unknown, ask the requester instead of guessing.
Agent, model, or tool identities can appear in `Co-authored-by` trailers, separate from human `Signed-off-by` trailers.
9. Do not make or check off a human declaration of code understanding or responsibility on the submitter's behalf. Do not present an agent review as a human review.
10. Follow the repository's AI disclosure requirements and template fields. Keep AI disclosure separate from `Signed-off-by`.
11. Do not add code comments or documentation comments, except license headers, shebangs, and other machine-required lines.
12. Do not commit credentials, private configuration, or machine-specific local paths.
13. Use isolated temporary data and configuration for validation. Do not change real user state during temporary validation.
14. Change the source inputs or generator instead of editing generated output directly. Update affected documentation in the same change.

## Project

- This repository provides the Tokener model provider plugin for DeepSeek Harness.
- Use `@tokener-ai/dsh-tokener-provider` as the npm package name.
- Use dotted SemVer prerelease identifiers, such as `0.1.0-beta.1`.
- The repository uses the MIT license.
