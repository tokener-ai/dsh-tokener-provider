# Tokener provider for DeepSeek Harness

Connect Tokener to DeepSeek Harness without the Tokener CLI or rx. The plugin adds a Tokener page to Settings. Harness stores your API key in its credential store, not in the plugin configuration.

Version `0.1.0-beta.1` is a beta release. It requires Node.js 24.9 or later. The allowed DeepSeek Harness range is `>=0.2.2-rc.1 <0.3.0-0`. The plugin was tested on `0.2.2-rc.1`. Later `0.2.x` versions, including prereleases, can install the plugin but remain unverified.

## Install and connect

Install the npm package:

```sh
dsh plugin --profile web add @tokener-ai/dsh-tokener-provider@beta
```

Harness requires an explicit profile. The command installs into the web profile. For another profile, use `dsh plugin --profile <profile> add @tokener-ai/dsh-tokener-provider@beta`. The Settings page requires the web UI.

1. Start `dsh web` and open Settings → Tokener.
2. Paste your Tokener API key.
3. Select **Connect and refresh models**.
4. Select a Tokener model from the conversation model picker.

If the page does not appear after installation, restart Harness. To refresh your available models, enter the API key again and connect. An invalid key does not replace your stored key or model configuration.

The npm `beta` tag provides the beta release. No stable release is available. After the `latest` tag provides a stable release, you can install the package without `@beta`. No official plugin market is required.

Harness saves the resolved version. To install a newer beta, run the installation command again.

## Models and credentials

The plugin validates your key through `GET https://api.tokener.ai/v1/models`. It reads model metadata from the anonymous public catalog at `https://console.tokener.ai/api/public/v1/models` and joins the two lists by model ID. Your API key goes only to `api.tokener.ai`. The public catalog request sends no credentials and follows no redirects.

Models whose catalog provider is `Anthropic` use Anthropic Messages. Other providers use OpenAI Responses, the Tokener agent protocol declared in rx. This is a provider policy. It is not proof that every model works on that protocol. The public catalog supplies the label, context capacity, output limit, and capabilities. The `vision` capability enables image input. Harness accepts text and image inputs. The plugin does not claim PDF support.

The plugin supports catalog `schemaVersion: 1`. `catalogRevision` identifies catalog content; it does not select a schema. If the catalog is unreachable, invalid, or on an unsupported schema version, connection fails and the saved key and routes stay unchanged. There is no static capacity fallback or runtime models.dev lookup.

Only authorized chat models with positive context and output limits and declared streaming and tool support enter the model picker. A missing catalog entry, missing limit, or missing capability excludes that model. Settings lists the excluded IDs and reasons. If no models qualify, the saved connection stays unchanged. A missing label uses the model ID. New models with complete catalog metadata can appear without a plugin update.

Only reasoning levels remain static. `src/model-metadata.json` records the rx capability-table source and its exact protocol-specific wire values. The catalog must also declare `reasoning` before the plugin offers these controls. Models without verified levels use the provider default and show no effort selector. The plugin does not change a rejected value to another value or retry it. Harness owns request conversion, streaming, tools, and credential injection. An upstream rejection remains an error.

The plugin writes two Harness routes: `tokener` and `tokener-claude`. Connecting replaces these routes and preserves other routes. Configuration contains only the `TOKENER_API_KEY` reference. Harness resolves the stored key for each request. Do not assume that its local credential store encrypts secrets.

Start a new conversation when you change models or providers. Encrypted reasoning from one upstream is not portable across upstreams.

## Remove and develop

Removing the plugin removes its Settings page. The saved routes and credential remain Harness-owned configuration. Remove those routes in Settings → Models and remove the `TOKENER_API_KEY` credential if you no longer use it.

Run `pnpm install --frozen-lockfile` to install development dependencies. Run `pnpm check` for the credential and routing contracts, client build, and JavaScript syntax. Run `pnpm pack` to make a local archive. Install that archive with `dsh plugin --profile web add /absolute/path/to/package.tgz`. The generated client uses the host React instance and the host remote APIs. No adapter or pi-ai copy ships in the archive.

Only `package.json` owns the package name. `pnpm build` generates the bundle patch and client module identity from that name. Rebuild those files after changing the name.

The MIT license applies to this repository.
