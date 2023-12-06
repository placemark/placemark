import clsx from "clsx";
import { styledPanelTitle } from "./elements";
import * as C from "@radix-ui/react-collapsible";
import { CaretDownIcon, CaretRightIcon } from "@radix-ui/react-icons";
import React from "react";
import { useAtom } from "jotai";
import { PanelAtom } from "state/jotai";

export function PanelDetails({
  children,
  accessory,
  variant = "default",
  title,
}: {
  children: React.ReactNode;
  accessory?: React.ReactNode;
  variant?: "default" | "fullwidth";
  title: string;
}) {
  return (
    <div>
      <div className={styledPanelTitle({})}>
        {title}
        {accessory}
      </div>
      <div
        className={clsx(
          {
            "px-3": variant === "default",
          },
          `pb-3 contain-layout`
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function PanelDetailsCollapsible({
  title,
  children,
  atom,
}: React.PropsWithChildren<{
  title: string;
  atom: PanelAtom;
}>) {
  const [open, setOpen] = useAtom(atom);
  return (
    <C.Root open={open} onOpenChange={setOpen}>
      <C.Trigger className={styledPanelTitle({ interactive: true })}>
        <span>{title}</span>
        {open ? (
          <CaretDownIcon className="w-3 h-3" />
        ) : (
          <CaretRightIcon className="w-3 h-3" />
        )}{" "}
      </C.Trigger>
      <C.Content className="px-3 pb-3 contain-layout">{children}</C.Content>
    </C.Root>
  );
}
