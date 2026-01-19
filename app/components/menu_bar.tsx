import {
  GitHubLogoIcon,
  KeyboardIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";
import { FileInfo } from "app/components/file_info";
import { useSetAtom } from "jotai";
import { DropdownMenu as DD } from "radix-ui";
import { memo } from "react";
import { dialogAtom } from "state/jotai";
import { Button, DDContent, PlacemarkIcon, StyledItem } from "./elements";
import { MenuBarDropdown } from "./menu_bar/menu_bar_dropdown";

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
          <a
            href="https://github.com/placemark/placemark"
            className="text-purple-600 hover:text-purple-700 flex items-center gap-1 text-sm bg-purple-100 px-2 py-1 rounded"
          >
            <GitHubLogoIcon />
            Open Source
          </a>
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

function HelpDot() {
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
      </DDContent>
    </DD.Root>
  );
}
