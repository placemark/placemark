import dynamic from "next/dynamic";
import { ErrorBoundary } from "@blitzjs/next";
import {
  Button,
  DefaultErrorBoundary,
  Loading,
  DDContent,
  MinimalHeader,
  MinimalHeaderLogoLink,
} from "app/components/elements";
import Notifications from "app/components/notifications";
import React, { Suspense } from "react";
import { Dialogs } from "app/components/dialogs";
import type { LayoutProps } from "./shared";
import { LayoutHead } from "./shared";
import { useCurrentUser } from "app/core/hooks/useCurrentUser";
import { CaretSortIcon } from "@radix-ui/react-icons";
import { DarkModeEffect } from "app/components/dark_mode_effect";
import * as DD from "@radix-ui/react-dropdown-menu";
import { OrganizationSwitchList } from "app/components/organization_switch_list";
import { Provider } from "jotai";
import { HelpDot, UserDot } from "app/components/menu_bar";
import { News } from "app/components/news";
import { useBreakpoint } from "app/hooks/use_responsive";
import { Feedback } from "app/components/feedback";
import clsx from "clsx";
import { KeybindingsIndex } from "app/components/keybindings_index";

export function UserBlock() {
  const currentUser = useCurrentUser();

  if (!currentUser) return null;

  return (
    <DD.Root>
      <DD.Trigger asChild>
        <Button>
          <div className="space-y-0.5 truncate">
            <div className="truncate font-bold">
              {currentUser.organization.name}
            </div>
          </div>
          <div className="w-1" />
          <div className="flex-auto" />
          <div className="flex-shrink-0">
            <CaretSortIcon />
          </div>
        </Button>
      </DD.Trigger>
      <DDContent align="start">
        <OrganizationSwitchList currentUser={currentUser} />
      </DDContent>
    </DD.Root>
  );
}

const AuthenticatedPageLayout = ({
  title,
  children,
  actionButton = null,
  fullWidth = false,
}: LayoutProps & {
  actionButton?: React.ReactNode;
  fullWidth?: boolean;
}) => {
  const isSm = useBreakpoint("sm");

  return (
    <Provider>
      <>
        <LayoutHead title={title || ""}></LayoutHead>
        <div>
          <div className="block min-h-screen bg-white text-gray-700 dark:bg-gray-800 dark:text-white">
            <Suspense fallback={<MinimalHeader />}>
              <div className="flex flex-auto border-b dark:border-black border-gray-200 px-2 lg:px-0">
                <nav className="w-full max-w-4xl mx-auto flex items-center flex-auto gap-x-2 py-2">
                  <MinimalHeaderLogoLink />
                  <UserBlock />
                  <div className="flex-auto" />
                  {isSm ? (
                    <ErrorBoundary fallback={<div></div>}>
                      <News />
                    </ErrorBoundary>
                  ) : null}
                  <HelpDot />
                  {isSm ? <Feedback /> : null}
                  <UserDot />
                </nav>
              </div>
            </Suspense>
            <div
              className="flex-auto sm:pb-40 order-1 px-6 md:px-8"
              style={{
                minWidth: 0,
              }}
            >
              <div
                className={clsx(
                  fullWidth ? "" : "max-w-4xl",
                  "mx-auto pt-10 w-full"
                )}
              >
                {title ? (
                  <div className="flex justify-between items-center pt-0 pb-8">
                    <h1 className="text-2xl font-bold leading-7 text-gray-900 dark:text-gray-100 sm:text-3xl sm:tracking-tight sm:truncate">
                      {title}
                    </h1>
                    {actionButton}
                  </div>
                ) : null}
                <DefaultErrorBoundary>
                  <Suspense fallback={<Loading />}>{children}</Suspense>
                </DefaultErrorBoundary>
              </div>
            </div>
          </div>
        </div>
        <KeybindingsIndex />
        <Dialogs />
        <Notifications />
        <DarkModeEffect />
      </>
    </Provider>
  );
};

export default AuthenticatedPageLayout;
