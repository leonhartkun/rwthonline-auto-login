export function rwth_host_from_url(url) {
  try {
    const host = new URL(url).hostname;
    return host === "rwth-aachen.de" || host.endsWith(".rwth-aachen.de") ? host : "";
  } catch {
    return "";
  }
}
