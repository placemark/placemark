import { resolver } from "@blitzjs/rpc";
import { env } from "app/lib/env_server";
import { logger } from "integrations/log";
import { parseOneAddress } from "email-addresses";
import { z } from "zod";
import { workos } from "integrations/workos";

const GetWorkOSRedirect = z.object({
  email: z.string(),
});

/**
 * The workos redirect is based on the domain
 * of an email. For example, foo@google.com will
 * get SSO based on `google.com`.
 */
export async function getWorkOSRedirectInner(email: string) {
  /**
   * Parse the email address and get its domain.
   */
  const parsed = parseOneAddress(email);
  if (parsed?.type !== "mailbox") return null;
  const domain = parsed.domain;

  logger.info(`Searching for SAML with domain`, { domain });
  const organizations = await workos.organizations.listOrganizations({
    domains: [domain],
  });
  logger.info(`Organization count with that domain`, {
    count: organizations.data[0],
  });

  const organization = organizations.data[0];
  if (!organization) return null;

  const authorizationURL = workos.sso.getAuthorizationURL({
    organization: organization.id,
    clientID: env.WORKOS_CLIENT_ID,
    redirectURI: env.WORKOS_REDIRECT_URL,
  });

  return authorizationURL;
}

/**
 * The endpoint to initiate SSO via the WorkOS API
 * is responsible for simply handing off the rest of
 * the authentication workflow to WorkOS.
 *
 * https://workos.com/docs/sso/guide/integrate-with-app/add-an-endpoint-to-initiate-sso
 */
export default resolver.pipe(
  resolver.zod(GetWorkOSRedirect),
  async ({ email }) => {
    return getWorkOSRedirectInner(email);
  }
);
