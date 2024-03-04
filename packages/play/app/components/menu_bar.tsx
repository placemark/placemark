import Link from "next/link";
import React, { memo } from "react";
import { FileInfo } from "app/components/file_info";
import {
  EnvelopeClosedIcon,
  GitHubLogoIcon,
  KeyboardIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";
import { MemoryInfo } from "app/components/map_info/memory_info";
import { usePersistence } from "app/lib/persistence/context";
import * as DD from "@radix-ui/react-dropdown-menu";
import { Button, PlacemarkIcon, DDContent, StyledItem } from "./elements";
import { dialogAtom } from "state/jotai";
import { useSetAtom } from "jotai";
import { MenuBarDropdown } from "./menu_bar/menu_bar_dropdown";

export function MenuBarFallback() {
  return <div className="h-12 bg-gray-800"></div>;
}

function WrappedFeatureCollectionInfo() {
  const p = usePersistence();
  const [meta] = p.useMetadata();
  return (
    <>
      <Link
        href="/"
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

export const MenuBarPlay = memo(function MenuBar() {
  return (
    <div className="flex justify-between h-12 pr-2 text-black dark:text-white">
      <div className="flex items-center">
        <span
          className="py-1 pl-1 pr-2
          text-gray-500
          inline-flex gap-x-2 items-center"
          title="Home"
        >
          <PlacemarkIcon className="w-8 h-8" />
          Placemark Play
          <Link
            href="https://github.com/placemark/placemark"
            className="text-purple-600 hover:text-purple-700 flex items-center gap-1 text-sm bg-purple-100 px-2 py-1 rounded"
          >
            <GitHubLogoIcon />
            Open Source
          </Link>
        </span>
        <FileInfo />
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
