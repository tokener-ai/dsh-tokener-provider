# Tokener provider for DeepSeek Harness

Use models from [Tokener](https://tokener.ai) in [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

Tokener gives you access to models through one account. Manage your API keys, prepaid credits, and usage in one place.

## Install and connect

With DeepSeek Harness installed, run:

```sh
dsh plugin --profile web add @tokener-ai/dsh-tokener-provider
dsh web
```

1. In the browser, open Settings → Tokener.
2. Paste your [Tokener API key](https://tokener.ai) and select Connect and refresh models.
3. Select a Tokener model from the conversation model picker.

![Tokener settings page in DeepSeek Harness](https://raw.githubusercontent.com/tokener-ai/dsh-tokener-provider/main/assets/settings.png)

If Tokener does not appear in Settings, restart Harness. To refresh models, enter your API key and connect again.

Your key goes only to Tokener, and Harness saves it. Do not assume that Harness encrypts it.

Uninstalling the plugin keeps your saved Tokener models and API key. To remove the models, delete the Tokener entries in Settings → Models. If you no longer need the key, revoke it in your [Tokener account](https://tokener.ai) because Harness can still keep it.

This project uses the [MIT license](LICENSE).
