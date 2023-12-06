import Link from "next/link";
import { env } from "app/lib/env_client";
import { useMutation, invalidateQuery, useQuery } from "@blitzjs/rpc";
import { BlitzPage, Routes } from "@blitzjs/next";
import AuthenticatedPageLayout from "app/core/layouts/authenticated_page_layout";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Button,
  CapsLabel,
  StyledDialogClose,
  StyledDialogContent,
  StyledDialogOverlay,
  styledButton,
} from "app/components/elements";
import { useCurrentUser } from "app/core/hooks/useCurrentUser";
import React, { useState } from "react";
import changePassword from "app/auth/mutations/changePassword";
import { Form, FORM_ERROR } from "app/core/components/Form";
import { LabeledTextField } from "app/core/components/LabeledTextField";
import {
  ChangeEmail,
  ChangePassword,
  UpdateUserOptions,
} from "app/auth/validations";
import { toast } from "react-hot-toast";
import getCurrentUser from "app/users/queries/getCurrentUser";
import updateUserOptions from "app/auth/mutations/updateUserOptions";
import changeEmail from "app/auth/mutations/changeEmail";
import getGitHubStatus from "app/users/queries/getGitHubStatus";
import deleteGitHubTokenMutation from "app/auth/mutations/deleteGitHubToken";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { useWalkthrough } from "app/hooks/use_walkthrough";
import { useSession } from "@blitzjs/auth";
import { PAUSABLE_ORGS } from "app/lib/constants";

interface SubformProps {
  onSuccess: () => void;
}

function PauseMembershipRow() {
  const session = useSession();

  const orgId = session.orgId;

  if (!(orgId && PAUSABLE_ORGS.has(orgId))) {
    return null;
  }

  return (
    <div className="flex justify-between items-start py-6">
      <div>
        <CapsLabel>Pause membership</CapsLabel>
        <div>
          <div>Pause your membership until the next time you log in.</div>
        </div>
      </div>
      <div>
        <Link href={Routes.PauseMembershipPage()} className={styledButton({})}>
          Pause membership
        </Link>
      </div>
    </div>
  );
}

function WalkthroughRow() {
  const [, { restart }] = useWalkthrough("V1_00_CREATEMAP");
  return (
    <div className="flex justify-between items-start py-6">
      <div>
        <CapsLabel>Walkthrough</CapsLabel>
        <div>
          <div>Run through the introductory walkthrough again.</div>
        </div>
      </div>
      <div>
        <Button
          onClick={() => {
            restart();
            toast.success(
              `You’ll see the introductory walkthrough when you go to your maps index page`
            );
          }}
        >
          Restart
        </Button>
      </div>
    </div>
  );
}

function GitHubRow() {
  const [githubConnection] = useQuery(getGitHubStatus, {});
  const [deleteGitHubToken] = useMutation(deleteGitHubTokenMutation);
  return (
    <div className="flex justify-between items-start py-6">
      <div>
        <CapsLabel>GitHub</CapsLabel>
        <div>
          {githubConnection ? (
            <div>
              Connected to GitHub{" "}
              <div className="ml-2 v-mid inline-flex items-center gap-x-1 text-sm">
                <GitHubLogoIcon /> {githubConnection.login}
              </div>
            </div>
          ) : (
            <div>Connect to GitHub to share maps as Gists.</div>
          )}
        </div>
      </div>
      <div>
        {githubConnection ? (
          <div>
            <Button
              onClick={async () => {
                await toast.promise(
                  (async () => {
                    await deleteGitHubToken();
                    await invalidateQuery(getGitHubStatus, {});
                  })(),
                  {
                    success: "Disconnected from GitHub",
                    error: "Error disconnecting from GitHub",
                    loading: "Disconnecting from GitHub…",
                  }
                );
              }}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => {
              window.open(
                `${env.NEXT_PUBLIC_DOMAIN_WITH_SLASH}api/github/oauth/login`
              );
            }}
          >
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}

function ChangeEmailForm({ onSuccess }: SubformProps) {
  const [changeEmailMutation] = useMutation(changeEmail);

  return (
    <Form
      submitText="Change email"
      schema={ChangeEmail}
      track="user-change-email"
      initialValues={{ currentEmail: "", newEmail: "" }}
      onSubmit={async (values) => {
        try {
          await changeEmailMutation(values);
          toast.success("Email address changed");
          onSuccess();
        } catch (error: any) {
          return { [FORM_ERROR]: (error as Error).toString() };
        }
      }}
    >
      <LabeledTextField
        name="currentEmail"
        label="Current email"
        type="email"
      />
      <LabeledTextField name="newEmail" label="New email" type="email" />
    </Form>
  );
}

function UserNameForm({ onSuccess }: SubformProps) {
  const [updateUserOptionsMutation] = useMutation(updateUserOptions);
  const user = useCurrentUser();
  if (!user) throw new Error("User missing");
  return (
    <Form
      track="user-change-name"
      submitText="Update name"
      schema={UpdateUserOptions}
      initialValues={{ name: user.name || "" }}
      onSubmit={async (values) => {
        try {
          await updateUserOptionsMutation(values);
          toast.success("Name changed");
          await invalidateQuery(getCurrentUser, null);
          onSuccess();
        } catch (error: any) {
          return { [FORM_ERROR]: (error as Error).toString() };
        }
      }}
    >
      <LabeledTextField name="name" label="Name" type="text" />
    </Form>
  );
}

function ChangePasswordForm({ onSuccess }: SubformProps) {
  const [changePasswordMutation] = useMutation(changePassword);

  return (
    <Form
      submitText="Change password"
      track="user-change-password"
      schema={ChangePassword}
      initialValues={{ currentPassword: "", newPassword: "" }}
      onSubmit={async (values) => {
        try {
          await changePasswordMutation(values);
          toast.success("Password changed");
          onSuccess();
        } catch (error: any) {
          return { [FORM_ERROR]: (error as Error).toString() };
        }
      }}
    >
      <LabeledTextField
        name="currentPassword"
        label="Current password"
        type="password"
      />
      <LabeledTextField
        name="newPassword"
        label="New password"
        type="password"
      />
    </Form>
  );
}

export function SettingsRow({
  label,
  preview,
  Form,
}: {
  label: React.ReactNode;
  preview: React.ReactNode;
  Form: (arg0: SubformProps) => React.ReactElement;
}) {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  return (
    <div className="flex justify-between items-start py-6">
      <div>
        <CapsLabel>{label}</CapsLabel>
        <div className="text-md">{preview || "…"}</div>
      </div>
      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Trigger asChild>
          <Button>Edit</Button>
        </Dialog.Trigger>
        <StyledDialogOverlay />
        <StyledDialogContent>
          <StyledDialogClose />
          <Form onSuccess={() => setDialogOpen(false)} />
        </StyledDialogContent>
      </Dialog.Root>
    </div>
  );
}

const Settings: BlitzPage = () => {
  const session = useSession();
  const user = useCurrentUser();
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      <SettingsRow label="Name" preview={user.name} Form={UserNameForm} />
      <SettingsRow label="Email" preview={user.email} Form={ChangeEmailForm} />
      {user.workOsId ? (
        <div className="flex justify-between items-start">
          <div>
            <CapsLabel>Authentication</CapsLabel>
            <div className="text-md">
              Your account authenticates using SSO. Contact your administrator
              to update options.
            </div>
          </div>
        </div>
      ) : (
        <SettingsRow
          label="Password"
          preview={"•••••••"}
          Form={ChangePasswordForm}
        />
      )}
      <GitHubRow />
      <WalkthroughRow />
      {session.roles?.includes("OWNER") ? (
        <div className="flex py-6">
          <div>
            <CapsLabel>Billing & organizations</CapsLabel>
            <div>
              You can update your billing & organization settings on the{" "}
              <Link
                href={Routes.SettingsOrganization()}
                className="text-purple-700 underline hover:text-black dark:text-purple-500 dark:hover:text-purple-300"
              >
                organization settings page.
              </Link>
            </div>
          </div>
        </div>
      ) : null}
      <PauseMembershipRow />
    </div>
  );
};

Settings.getLayout = (page) => (
  <AuthenticatedPageLayout title="Account settings">
    {page}
  </AuthenticatedPageLayout>
);

export default Settings;
