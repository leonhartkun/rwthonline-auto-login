const CONFIGURATION_KEY = "user_configuration";

function normalize_configuration(configuration) {
  const required_fields = [
    "username",
    "password",
    "totp_secret",
    "totp_algorithm",
    "totp_digits",
    "totp_period",
  ];

  for (const field of required_fields) {
    if (configuration[field] === undefined || configuration[field] === "") {
      throw new Error(`Missing required configuration field: ${field}`);
    }
  }

  return {
    username: String(configuration.username).trim(),
    password: String(configuration.password),
    totp_secret: String(configuration.totp_secret).replace(/\s/g, "").toUpperCase(),
    totp_algorithm: String(configuration.totp_algorithm),
    totp_digits: Number(configuration.totp_digits),
    totp_period: Number(configuration.totp_period),
  };
}

export async function save_configuration(configuration) {
  await chrome.storage.local.set({
    [CONFIGURATION_KEY]: normalize_configuration(configuration),
  });
}

export async function get_configuration() {
  const stored = await chrome.storage.local.get(CONFIGURATION_KEY);
  const configuration = stored[CONFIGURATION_KEY];
  return configuration ? normalize_configuration(configuration) : null;
}

export async function has_configuration() {
  return (await get_configuration()) !== null;
}

export async function clear_configuration() {
  await chrome.storage.local.remove(CONFIGURATION_KEY);
}
