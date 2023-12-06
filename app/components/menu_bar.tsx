import Link from "next/link";
import { useRouter } from "next/router";
import { Routes } from "@blitzjs/next";
import React, { memo } from "react";
import { toast } from "react-hot-toast";
import { FileInfo } from "app/components/file_info";
import {
  EnvelopeClosedIcon,
  GitHubLogoIcon,
  KeyboardIcon,
  LockClosedIcon,
  MoonIcon,
  ReaderIcon,
  Share1Icon,
  SunIcon,
  SymbolIcon,
} from "@radix-ui/react-icons";
import { Feedback } from "app/components/feedback";
import { PersistedInfo } from "app/components/map_info/persisted_info";
import { MemoryInfo } from "app/components/map_info/memory_info";
import { usePersistence } from "app/lib/persistence/context";
import type { IPresence } from "types";
import * as T from "@radix-ui/react-tooltip";
import * as DD from "@radix-ui/react-dropdown-menu";
import * as P from "@radix-ui/react-popover";
import { formatCount } from "app/lib/utils";
import {
  Button,
  PlacemarkIcon,
  DDContent,
  StyledItem,
  StyledTooltipArrow,
  TContent,
  StyledPopoverContent,
  CopiableURL,
  StyledPopoverArrow,
} from "./elements";
import {
  followPresenceAtom,
  dialogAtom,
  syncingMachineAtom,
} from "state/jotai";
import { colorFromPresence } from "app/lib/color";
import { useAtom, useSetAtom } from "jotai";
import { useUpdateUser } from "app/hooks/update_user";
import { usePresences } from "app/lib/persistence/shared";
import { MenuBarDropdown } from "./menu_bar/menu_bar_dropdown";
import { DDSeparator } from "app/components/elements";
import { Step } from "./walkthrough";
import { gistUrlFromId } from "app/lib/api";

export function MenuBarFallback() {
  return <div className="h-12 bg-gray-800"></div>;
}

function WrappedFeatureCollectionInfo() {
  const p = usePersistence();
  const [meta] = p.useMetadata();
  return meta.type === "persisted" ? (
    <>
      <Link
        href={Routes.PlacemarkIndex(
          meta.wrappedFeatureCollectionFolderId
            ? {
                parent: meta.wrappedFeatureCollectionFolderId,
              }
            : {}
        )}
        className="py-1 pl-1 pr-2
          dark:hover:bg-gray-700
          focus-visible:ring-1 focus-visible:ring-purple-300
          text-purple-500 hover:text-purple-700 dark:hover:text-purple-300"
        title="Home"
      >
        <PlacemarkIcon className="w-8 h-8" />
      </Link>
      <PersistedInfo metadata={meta} />
    </>
  ) : (
    <>
      <Link
        href={Routes.PlacemarkIndex()}
        className="py-1 pl-1 pr-2
          dark:hover:bg-gray-700
          focus-visible:ring-1 focus-visible:ring-purple-300
          text-purple-500 hover:text-purple-700 dark:hover:text-purple-300"
        title="Home"
      >
        <PlacemarkIcon className="w-8 h-8" />
      </Link>
      <MemoryInfo metadata={meta} />
    </>
  );
}

function AvatarDot({ user }: { user: IPresence }) {
  return (
    <div
      className="w-6 h-6 bg-white border-2 rounded-full dark:border-gray-900 hover:border-gray-500"
      style={{
        backgroundImage: `url(/api/avatar?id=${user.userId})`,
        borderColor: colorFromPresence(user),
        backgroundSize: "cover",
      }}
    />
  );
}

const BLOB_LIMIT = 2;

const BlobDisplays = function BlobDisplay() {
  const { user } = useUpdateUser();
  const presences = usePresences(user.id);
  const [followPresence, setFollowPresence] = useAtom(followPresenceAtom);
  const blobs = presences.slice(0, BLOB_LIMIT);
  const otherCount = presences.length - 4;

  if (followPresence) {
    const user = followPresence;
    return (
      <Button
        size="sm"
        type="button"
        title="Stop following"
        onClick={() => {
          setFollowPresence(null);
        }}
      >
        <AvatarDot user={user} />
        <div>Following</div>
      </Button>
    );
  }

  return (
    <T.Root>
      <P.Root>
        <T.Trigger asChild>
          <P.Trigger asChild>
            <div className="flex items-center pr-2">
              {blobs.map((user) => {
                return (
                  <div className="-mr-2" key={user.userId}>
                    <AvatarDot user={user} />
                  </div>
                );
              })}
              {otherCount > 0 ? (
                <div className="ml-3 text-xs">+{formatCount(otherCount)}</div>
              ) : null}
            </div>
          </P.Trigger>
        </T.Trigger>
        <StyledPopoverContent>
          <StyledPopoverArrow />
          <div className="font-bold pb-3">Participants</div>
          <div className="max-h-48 overflow-auto placemark-scrollbar">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {presences.map((presence) => {
                return (
                  <button
                    key={presence.userId}
                    type="button"
                    className="flex w-full items-center gap-x-2 py-2 opacity-70 hover:opacity-100"
                    onClick={() => {
                      setFollowPresence(presence);
                    }}
                  >
                    <AvatarDot user={presence} />
                    {presence.userName}
                  </button>
                );
              })}
            </div>
          </div>
        </StyledPopoverContent>
      </P.Root>
      <TContent>
        <StyledTooltipArrow />
        <div className="flex flex-col gap-y-1 items-center">
          <div className="text-xs text-gray-500 whitespace-nowrap">
            Follow a user
          </div>
        </div>
      </TContent>
    </T.Root>
  );
};

function SyncingInfo() {
  const [syncState] = useAtom(syncingMachineAtom);

  return syncState.matches("spinner") ? (
    <P.Root>
      <P.Trigger asChild>
        <Button variant="quiet" title="Syncing">
          <SymbolIcon className="w-4 h-4 animate-spin" />
        </Button>
      </P.Trigger>
      <StyledPopoverContent size="md">
        <StyledPopoverArrow />
        <div className="space-y-2 text-sm">
          <div>Syncing</div>
        </div>
      </StyledPopoverContent>
    </P.Root>
  ) : (
    <div className="w-4" />
  );
}

function GistInfo() {
  const rep = usePersistence();
  const [meta] = rep.useMetadata();

  if (meta.type !== "persisted") return null;
  if (!meta.gistId) return null;

  return (
    <P.Root>
      <P.Trigger asChild>
        <Button variant="quiet" title="Map shared as Gist">
          <GitHubLogoIcon />
        </Button>
      </P.Trigger>
      <StyledPopoverContent size="md">
        <StyledPopoverArrow />
        <div className="space-y-2 text-sm">
          <div>This map is shared as a Gist</div>
          <CopiableURL url={gistUrlFromId(meta.gistId)} />
        </div>
      </StyledPopoverContent>
    </P.Root>
  );
}

function ShareInfo() {
  const rep = usePersistence();
  const [meta] = rep.useMetadata();
  const setDialogState = useSetAtom(dialogAtom);

  if (meta.type !== "persisted") {
    return null;
  }

  return (
    <>
      <div className="w-2" />
      <Step
        id="V1_04_SHARE"
        onBeforeNext={() => {
          toast.success("We hope you enjoy mapping with Placemark!");
        }}
      >
        <Button
          variant="quiet"
          title="Adjust map privacy"
          onClick={() => {
            setDialogState({
              type: "api",
            });
          }}
        >
          {meta.access === "PRIVATE" ? (
            <LockClosedIcon aria-label="Map is currently private" />
          ) : (
            <Share1Icon aria-label="Map is currently shared" />
          )}
        </Button>
      </Step>
    </>
  );
}

export const MenuBarPlay = memo(function MenuBar() {
  return (
    <div className="flex justify-between h-12 pr-2 text-black dark:text-white">
      <div className="flex items-center">
        <Link
          href="https://placemark.io/"
          className="py-1 pl-1 pr-2
          dark:hover:bg-gray-700
          focus-visible:ring-1 focus-visible:ring-purple-300
          text-purple-500 hover:text-purple-700 dark:hover:text-purple-300
          inline-flex gap-x-2 items-center"
          title="Home"
        >
          <PlacemarkIcon className="w-8 h-8" />
          Placemark{" "}
          <span
            className="bg-purple-100
            border border-purple-300
            shadow-sm
            px-2 py-1 inline-block rounded-md text-sm font-semibold"
          >
            Play
          </span>
        </Link>
        <FileInfo />
        <ShareInfo />
        <SyncingInfo />
      </div>
      <div className="flex items-center gap-x-2">
        <MenuBarDropdown />

        <HelpDot />
        <Feedback />
      </div>
    </div>
  );
});

export const MenuBar = memo(function MenuBar() {
  return (
    <div className="flex justify-between h-12 pr-2 text-black dark:text-white">
      <div className="flex items-center">
        <WrappedFeatureCollectionInfo />
        <FileInfo />
        <ShareInfo />
        <GistInfo />
        <SyncingInfo />
      </div>
      <div className="flex items-center gap-x-2">
        <BlobDisplays />
        <MenuBarDropdown />

        <HelpDot />
        <Feedback />
        <UserDot />
      </div>
    </div>
  );
});

export function HelpDot() {
  const setDialogState = useSetAtom(dialogAtom);
  return (
    <DD.Root>
      <DD.Trigger asChild>
        <Button variant="quiet">Help</Button>
      </DD.Trigger>
      <DDContent>
        <StyledItem
          onSelect={() => {
            setDialogState({ type: "cheatsheet" });
          }}
        >
          <KeyboardIcon />
          Keyboard shorcuts
        </StyledItem>
        <StyledItem
          onSelect={() => {
            window.open("https://www.placemark.io/documentation-index");
          }}
        >
          <ReaderIcon /> Documentation
        </StyledItem>
        <StyledItem
          onSelect={() => {
            window.open("https://confirmsubscription.com/h/y/13501B63095BB913");
          }}
        >
          <EnvelopeClosedIcon /> Sign up for updates
        </StyledItem>
      </DDContent>
    </DD.Root>
  );
}

export function UserDot() {
  const { user: currentUser, setUser } = useUpdateUser();
  const router = useRouter();
  return (
    <DD.Root>
      <DD.Trigger asChild>
        <Button variant="quiet">
          <div
            className="w-4 h-4
        bg-white
        rounded-full
        border border-gray-300
        dark:border-gray-900"
            style={{
              backgroundImage: `url(/api/avatar?id=${currentUser.id})`,
              backgroundSize: "cover",
            }}
          />
          Account
        </Button>
      </DD.Trigger>
      <DDContent>
        <StyledItem
          onSelect={() => {
            void setUser({
              darkMode: !currentUser.darkMode,
            });
          }}
        >
          Toggle dark mode {currentUser.darkMode ? <SunIcon /> : <MoonIcon />}
        </StyledItem>
        <StyledItem
          onSelect={() => {
            void router.push(Routes.Settings());
          }}
        >
          Account settings
        </StyledItem>
        <DDSeparator />
        <StyledItem
          onClick={async () => {
            await router.push(Routes.LogoutPage());
          }}
        >
          Log out
        </StyledItem>
      </DDContent>
    </DD.Root>
  );
}
