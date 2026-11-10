# Tokener provider for DeepSeek Harness

[![Check](https://github.com/tokener-ai/dsh-tokener-provider/actions/workflows/check.yml/badge.svg?branch=main)](https://github.com/tokener-ai/dsh-tokener-provider/actions/workflows/check.yml) [![License: MIT](https://img.shields.io/github/license/tokener-ai/dsh-tokener-provider)](LICENSE)

Use models from [Tokener](https://tokener.ai) in the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web UI. Connect your API key in Settings, then select a model in your conversation.

This plugin is in beta. It requires Node.js 24.9+ and DeepSeek Harness `>=0.2.2-rc.1 <0.3.0-0`.

## Install and connect

With DeepSeek Harness installed, run:

```sh
dsh plugin --profile web add @tokener-ai/dsh-tokener-provider@beta
dsh web
```

1. Open Settings → Tokener.
2. Paste your [Tokener API key](https://tokener.ai) and select **Connect and refresh models**.
3. Select a Tokener model from the conversation model picker.

If Settings → Tokener does not appear, restart Harness. To refresh models, enter your API key and connect again. To update the plugin, run the installation command again.

## Compatibility and models

Version `0.1.0-beta.1` is a prerelease. Both npm tags, `beta` and `latest`, currently resolve to this beta. Later compatible Harness `0.2.x` releases remain unverified.

The plugin lists authorized chat models with complete public catalog metadata, context and output limits, streaming, and tool support. Settings shows excluded models and their reasons. If discovery or catalog validation fails, the saved connection stays unchanged.

Anthropic models use Anthropic Messages. Other models use OpenAI Responses. A listed model does not guarantee that its upstream supports the selected protocol.

Start a new conversation when you change models or providers. Encrypted reasoning is not portable across upstreams.

## Credentials and removal

The plugin sends your API key only to `api.tokener.ai`. It reads the public model catalog without credentials. Harness stores your API key in its credential store. Do not assume that this store encrypts secrets.

Connecting replaces the `tokener` and `tokener-claude` routes and preserves other routes. Route configuration references `TOKENER_API_KEY` rather than the key itself. If saving fails after credential storage succeeds, the key can change before the routes do.

Removing the plugin removes its Settings page. Saved routes and credentials remain. If you no longer use them, remove both routes in Settings → Models and remove the `TOKENER_API_KEY` credential.

## Development

Run `pnpm install --frozen-lockfile` to install dependencies. Run `pnpm check` for tests, the client build, and syntax checks. See [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a change.

This project uses the [MIT license](LICENSE).
