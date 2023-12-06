import { Organization } from "@prisma/client";
import { UOrganization } from "app/lib/uorganization";
import { Badge } from "./elements";

export function OrganizationEnterpriseBadge({
  organization,
}: {
  organization: Organization;
}) {
  return UOrganization.isEnterprise(organization) ? (
    <Badge>Enterprise</Badge>
  ) : null;
}
