import type { AuthenticatedClientSession } from "@blitzjs/auth";
import type { Role } from "types";

export function simpleRolesIsAuthorized({
  session,
  roles,
}: {
  session: AuthenticatedClientSession;
  roles: string[];
}) {
  for (const role of roles) {
    if (session.roles.includes(role as Role)) return true;
  }
  return false;
}
