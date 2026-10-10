export function publicUrlFromEnvironment(environment) {
  const explicit = environment.PUBLIC_URL?.trim();
  if (explicit) return explicit;
  const domain = environment.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (!domain) return undefined;
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(domain)) {
    throw new Error('RAILWAY_PUBLIC_DOMAIN must contain a hostname only.');
  }
  return `https://${domain}`;
}
