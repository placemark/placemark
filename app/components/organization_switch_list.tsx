import Link from "next/link";
import { Routes } from "@blitzjs/next";
import { useMutation } from "@blitzjs/rpc";
import type { CurrentUser } from "app/users/queries/getCurrentUser";
import { RadioGroup, ItemIndicator, Item } from "@radix-ui/react-dropdown-menu";
import switchOrganization from "app/auth/mutations/switchOrganization";
import toast from "react-hot-toast";
import { PlusIcon, CheckIcon, GearIcon } from "@radix-ui/react-icons";
import React from "react";
import { StyledMenuLink, StyledRadioItem, DDSeparator } from "./elements";
import { OrganizationEnterpriseBadge } from "./organization_enterprise_badge";

export function OrganizationSwitchList({
  currentUser,
}: {
  currentUser: CurrentUser;
}) {
  const [switchOrganizationMutation] = useMutation(switchOrganization);
  return (
    <>
      <RadioGroup
        value={currentUser.organization.id.toString()}
        onValueChange={async (id) => {
          try {
            await switchOrganizationMutation({
              id: +id,
            });
            window.location.reload();
          } catch (e) {
            toast.error("Could not switch organizations");
          }
        }}
      >
        {currentUser.memberships.map((membership) => {
          return (
            <StyledRadioItem
              key={membership.id}
              value={membership.organization.id.toString()}
            >
              <div className="flex items-center justify-start gap-x-2">
                <div className="w-3">
                  <ItemIndicator>
                    <CheckIcon className="w-3 h-3" />
                  </ItemIndicator>
                </div>
                {membership.organization.name}
                <OrganizationEnterpriseBadge
                  organization={membership.organization}
                />
              </div>
            </StyledRadioItem>
          );
        })}
      </RadioGroup>
      <Item>
        <Link href={Routes.SettingsOrganization()} legacyBehavior>
          <StyledMenuLink>
            <GearIcon />
            Organization settings
          </StyledMenuLink>
        </Link>
      </Item>
      <DDSeparator />
      <Item>
        <Link href={Routes.NewOrganization()} legacyBehavior>
          <StyledMenuLink>
            <PlusIcon />
            Create organization
          </StyledMenuLink>
        </Link>
      </Item>
    </>
  );
}
