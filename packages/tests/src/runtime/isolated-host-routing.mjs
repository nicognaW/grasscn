/** @typedef {{ fixturePort: number, previewPort: number, proxyPort: number }} HostExecution */

/** @param {HostExecution} execution - Verification input. */
const ports = (execution) => {
  const { fixturePort, previewPort, proxyPort } = execution;

  return {
    map: new Map([
      [5174, fixturePort],
      [5178, fixturePort],
      [5176, previewPort],
    ]),
    owned: new Set([fixturePort, previewPort]),
    proxyPort,
  };
};

/**
 * @param {string} url - Verification input.
 * @param {string} host - Verification input.
 * @param {HostExecution} execution - Verification input.
 */
export const isolatedHttpTarget = (url, host, execution) => {
  const { owned, map } = ports(execution);
  const target = new URL(url, `http://${host}`);

  if (
    target.protocol !== "http:" ||
    !["127.0.0.1", "localhost"].includes(target.hostname) ||
    target.username ||
    target.password
  ) {
    throw new Error("Unowned browser request");
  }

  const port = map.get(Number(target.port)) ?? Number(target.port);

  if (!owned.has(port)) {
    throw new Error("Unowned browser port");
  }

  target.hostname = "127.0.0.1";
  target.port = String(port);

  return target;
};

/**
 * @param {string} authority - Verification input.
 * @param {HostExecution} execution - Verification input.
 */
export const isolatedTunnelTarget = (authority, execution) => {
  const { owned, map, proxyPort } = ports(execution);
  const target = new URL(`http://${authority}`);

  if (
    !["127.0.0.1", "localhost"].includes(target.hostname) ||
    target.host !== authority
  ) {
    throw new Error("Unowned tunnel");
  }

  const port =
    target.port === "5173"
      ? proxyPort
      : (map.get(Number(target.port)) ?? Number(target.port));

  if (target.port !== "5173" && !owned.has(port)) {
    throw new Error("Unowned tunnel port");
  }

  return port;
};
