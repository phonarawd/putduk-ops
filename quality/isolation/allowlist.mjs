const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

export function isLoopbackHostname(hostname) {
  return LOOPBACK.has(hostname);
}

export function isIsolatedAllowed(url, qaPort = process.env.PUTDUK_OPS_QA_PORT || "4177") {
  if (url.protocol === "data:" || url.protocol === "blob:" || url.protocol === "about:") return true;
  if (url.protocol === "mock:") return url.hostname === "isolated-qa";
  if (!isLoopbackHostname(url.hostname)) return false;
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  return port === String(qaPort);
}

export function isDeniedUrl(url, qaPort) {
  return !isIsolatedAllowed(url, qaPort);
}

export function assertNoProdHost(url) {
  const host = url.hostname.toLowerCase();
  if (host === "api.hiptk.app" || host === "hiptk.app" || host.endsWith(".hiptk.app")) {
    throw new Error(`운영 호스트 차단: ${url.href}`);
  }
}
