import Link from "next/link";
import React, { memo } from "react";
import { FileInfo } from "app/components/file_info";
import {
  EnvelopeClosedIcon,
  GitHubLogoIcon,
  KeyboardIcon,
  LockClosedIcon,
  ReaderIcon,
  Share1Icon,
  SymbolIcon,
} from "@radix-ui/react-icons";
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
import { usePresences } from "app/lib/persistence/shared";
import { MenuBarDropdown } from "./menu_bar/menu_bar_dropdown";
import { DDSeparator } from "app/components/elements";
import { gistUrlFromId } from "app/lib/api";

export function MenuBarFallback() {
  return <div className="h-12 bg-gray-800"></div>;
}

function WrappedFeatureCollectionInfo() {
  const p = usePersistence();
  const [meta] = p.useMetadata();
  return (
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
      </div>
      <div className="flex items-center gap-x-2">
        <MenuBarDropdown />

        <HelpDot />
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
      </div>
      <div className="flex items-center gap-x-2">
        <MenuBarDropdown />

        <HelpDot />
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
