# Oklahoma collaboration application

## Source of truth

- The released system remains the `main` branch.
- Proposed system changes are created from `development` and sent as one pull request per proposal bundle.
- Merging a proposal updates the relevant `Oklahoma/*/index.bml` file on `development`. Promotion from `development` to `main` remains the existing release step.
- Approval and merge remain GitHub operations. The application displays their status but does not create a separate approval state.
- Public visitors may read the system, but only Honda and Seshimo may create comments, proposals, reviews, or merges.

## Authentication and authorization

Use a GitHub App installed only on `minamitopon/system-summary`.

- Authenticate each editor with the GitHub App user authorization flow and PKCE.
- Validate the returned identity against a server-side allowlist containing only the immutable GitHub user IDs below. Login names are display data and may change.
  - Honda: `pon-64` (`57282671`)
  - Seshimo: `minamitopon` (`51054184`)
- Revalidate the GitHub identity on every new sign-in.
- Store only a random session identifier in a `Secure`, `HttpOnly`, `SameSite=Lax` cookie. Keep access and refresh tokens on the server in encrypted storage. Never place them in browser storage.
- Use GitHub App user access tokens for user-triggered writes so that proposals, reviews, issue comments, and merges are attributed to the person who performed them.
- Reject every API request from users outside the allowlist, even if the UI route is known.

Required repository permissions:

- Metadata: read
- Contents: read and write
- Pull requests: read and write
- Issues: read and write

## Proposal bundle workflow

1. A user edits an existing agreement or adds a response from the system viewer.
2. Each change is added to an in-progress proposal bundle; no GitHub write happens yet.
3. The proposal drawer shows all changes together as a diff.
4. The draft stores the file path, base blob SHA, original line, surrounding auction context, and proposed replacement. On explicit submission, the server fetches the latest `development` branch and verifies that every original line still matches.
5. The server creates one feature branch, applies all changes, makes one or more commits, and creates one pull request against `development`.
6. The application automatically requests the other person as the only reviewer: Honda proposals request Seshimo; Seshimo proposals request Honda.
7. The author cannot approve or merge their own proposal. The backend verifies that the reviewer is the other allowlisted user before submitting an approval or merge request.
8. After the counterpart approves, that counterpart merges the pull request. GitHub writes the merged content into the relevant `index.bml` file, and the application refreshes from the updated branch.

If the source changed after the draft was started, submission stops and asks the user to resolve the conflicting item. It must not overwrite the newer system automatically.

### GitHub enforcement

The `development` branch must be protected so this rule cannot be bypassed from either the application or the GitHub website:

- require a pull request before merging;
- require one approving review;
- dismiss stale approvals when new commits are pushed;
- require approval of the most recent reviewable push by someone other than the pusher;
- require conversation resolution;
- apply the rule to administrators and do not allow bypassing it;
- block force pushes and branch deletion.

The application-level counterpart check is an additional guard, not a replacement for branch protection. As of the design audit, GitHub returned no protection configuration for `development`, so this must be configured before authenticated proposal submission is enabled.

## Comments and questions

- Questions that are not part of a proposal are created under the signed-in user's identity as GitHub Issues with a dedicated label such as `system-question`.
- The issue body stores the source path, stable agreement identifier, displayed auction sequence, and quoted text.
- Replies are GitHub issue comments and are displayed inline in the application.
- Questions attached to an existing proposal use the pull request conversation instead.
- Closing the issue marks the question resolved; the application does not invent a second status model.

## Hosting and storage

GitHub Pages alone cannot safely perform authenticated writes because it has no trusted server for the GitHub App private key or user sessions. The live application therefore needs a trusted server runtime (for example Cloudflare Workers) and durable encrypted storage for sessions. Unsubmitted proposal drafts may stay in browser storage or be synchronized server-side later.

The public viewer must never receive a repository token. It reads system content through the trusted backend or from a deployment artifact. Authenticated write endpoints fetch the latest private repository content on the server and validate the stored blob SHA before applying a change.

The current local preview intentionally keeps proposal changes and comments in memory and disables PR submission. It is only for testing the interaction design; it does not pretend to be the final shared data store.
