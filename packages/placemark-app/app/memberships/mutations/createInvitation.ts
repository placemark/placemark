import { resolver } from "@blitzjs/rpc";
import db from "db";
import { Invite } from "app/organizations/validations";
import { invitationMailer } from "mailers/invitationMailer";
import { nanoid } from "app/lib/id";
import addrs from "email-addresses";
import { AuthorizationError } from "blitz";

export function parseAddresses(rawEmails: string) {
  const emails = addrs.parseAddressList(rawEmails);

  if (!emails) {
    throw new Error("Couldn’t find any emails in that list.");
  }

  const flatAddresses: Array<{
    name: string | null;
    address: string;
  }> = [];

  for (const result of emails) {
    switch (result.type) {
      case "mailbox": {
        flatAddresses.push({
          name: result.name,
          address: result.address,
        });
        break;
      }
      case "group": {
        for (const address of result.addresses) {
          flatAddresses.push({
            name: address.name,
            address: address.address,
          });
        }
        break;
      }
    }
  }
  return flatAddresses;
}

export default resolver.pipe(
  resolver.zod(Invite),
  resolver.authorize("OWNER"),
  async ({ emails: rawEmails }, ctx) => {
    const id = ctx.session.orgId;

    if (!id) throw new AuthorizationError("No organization set up");

    await db.membership.findFirstOrThrow({
      where: { organizationId: id, userId: ctx.session.userId },
    });

    const flatAddresses = parseAddresses(rawEmails);

    const failedInvitations = await Promise.all(
      flatAddresses.map(async ({ name, address }) => {
        try {
          const invitationToken = nanoid();
          // TODO: use interactive transactions to roll back the invitation
          // if the mailer fails.
          // https://www.prisma.io/docs/concepts/components/prisma-client/transactions#interactive-transactions-in-preview
          await db.membership.create({
            data: {
              invitedEmail: address,
              invitedName: name,
              invitationToken,
              role: "USER",
              organizationId: id,
            },
          });
          await invitationMailer({ to: address, invitationToken }).send();
          return null;
        } catch (e) {
          return address;
        }
      })
    );

    const failed = failedInvitations.filter(Boolean) as string[];
    const invited = failedInvitations.filter((v) => v === null).length;

    return {
      failed,
      invited,
      success: failed.length === 0,
    };
  }
);
