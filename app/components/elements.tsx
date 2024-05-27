import Link from "next/link";
import classed from "classed-components";
import clsx from "clsx";
import type { ClassValue } from "clsx";
import { Field } from "formik";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as DD from "@radix-ui/react-dropdown-menu";
import * as CM from "@radix-ui/react-context-menu";
import * as Popover from "@radix-ui/react-popover";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as S from "@radix-ui/react-switch";
import * as Sentry from "@sentry/nextjs";
import * as Select from "@radix-ui/react-select";
import React from "react";
import {
  SymbolIcon,
  Cross1Icon,
  QuestionMarkCircledIcon,
  ClipboardCopyIcon,
  EyeNoneIcon,
  EyeOpenIcon,
} from "@radix-ui/react-icons";
import { SUPPORT_EMAIL } from "app/lib/constants";
import Placemark from "./icons/placemark";
import { toast } from "react-hot-toast";
import { Portal } from "@radix-ui/react-portal";

export function CopiableURL({ url }: { url: string }) {
  return (
    <div className="flex gap-x-2 items-stretch">
      <Input readOnly value={url} />
      <Button
        variant="quiet"
        onClick={() => {
          navigator.clipboard
            .writeText(url)
            .then(() => {
              toast("Copied");
            })
            .catch(() => {
              toast.error("Could not copy");
            });
        }}
      >
        <ClipboardCopyIcon />
      </Button>
    </div>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip.Root delayDuration={0}>
      <Tooltip.Trigger className="dark:text-white align-middle">
        <QuestionMarkCircledIcon />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <TContent>
          <div className="w-36">{children}</div>
        </TContent>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function PlacemarkIcon({ className }: React.HTMLAttributes<SVGElement>) {
  const circleAttrs = {
    r: "17.5",
    stroke: "currentColor",
    strokeWidth: "15",
  } as const;
  return (
    <svg
      viewBox="0 0 300 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="75" cy="75" {...circleAttrs} />
      <circle cx="225" cy="225" {...circleAttrs} />
      <circle cx="225" cy="75" {...circleAttrs} />
      <circle cx="75" cy="225" {...circleAttrs} />
      <line
        x1="75"
        y1="95"
        x2="75"
        y2="208"
        stroke="currentColor"
        strokeWidth="20"
      />
      <line
        x1="226"
        y1="95"
        x2="226"
        y2="208"
        stroke="currentColor"
        strokeWidth="20"
      />
      <line
        x1="95"
        y1="75"
        x2="208"
        y2="75"
        stroke="currentColor"
        strokeWidth="20"
      />
      <line
        x1="95"
        y1="225"
        x2="208"
        y2="225"
        stroke="currentColor"
        strokeWidth="20"
      />
      <rect x="110" y="110" width="80" height="80" rx="5" fill="currentColor" />
    </svg>
  );
}

export function StyledDropOverlayIndex({
  children,
}: React.PropsWithChildren<Record<string, unknown>>) {
  return (
    <Portal>
      <div className="absolute bottom-10 left-1/2">
        <div className="px-3 py-2 text-white bg-gray-500 rounded-md w-48 -m-24">
          {children}
        </div>
      </div>
    </Portal>
  );
}

export function StyledDropOverlay({
  children,
}: React.PropsWithChildren<Record<string, unknown>>) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-500 pointer-events-none bg-opacity-75">
      <div className="px-3 py-2 text-white bg-gray-500 rounded-md max-w-36">
        {children}
      </div>
    </div>
  );
}

type ErrorData = {
  error: Error;
  componentStack: string | null;
  eventId: string | null;
  resetError(): void;
};

export function Badge({
  children,
  variant = "default",
}: React.PropsWithChildren<{
  variant?: B3Variant;
}>) {
  return (
    <div
      className={clsx(
        {
          "bg-purple-100 dark:bg-gray-700": variant === "default",
          "": variant === "quiet",
        },
        `inline-flex uppercase
    text-gray-700 dark:text-gray-100
    font-bold text-xs px-1.5 py-0.5 rounded`
      )}
    >
      {children}
    </div>
  );
}

export function ErrorFallback(props: ErrorData) {
  return (
    <div className="max-w-xl p-4">
      <TextWell size="md">
        Sorry, an unexpected error occurred. The error’s already been
        automatically reported, but if you can let us know what happened, we can
        fix it even faster:{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}&subject=Error (ID: ${
            props.eventId || "?"
          })`}
          className={styledInlineA}
        >
          {SUPPORT_EMAIL}
        </a>
        .
      </TextWell>
      {props.resetError ? (
        <div className="pt-2">
          <Button onClick={() => props.resetError()}>Retry</Button>
        </div>
      ) : null}
    </div>
  );
}

export function DefaultErrorBoundary({
  children,
}: React.PropsWithChildren<unknown>) {
  return (
    <Sentry.ErrorBoundary showDialog fallback={ErrorFallback}>
      {children}
    </Sentry.ErrorBoundary>
  );
}

export function Loading({ size = "sm" }: { size?: B3Size }) {
  return (
    <div
      className={clsx(
        {
          "h-32": size === "sm",
          "h-16": size === "xs",
        },
        `text-gray-500 flex items-center justify-center`
      )}
    >
      <SymbolIcon className="animate-spin" />
      <span className="ml-2">Loading…</span>
    </div>
  );
}

export const CapsLabel = classed.label(
  "block uppercase font-semibold text-gray-500 dark:text-gray-500 text-xs"
);

const overlayClasses =
  "fixed inset-0 bg-black/20 dark:bg-white/20 z-50 placemark-fadein";

export const StyledAlertDialogOverlay = classed(AlertDialog.Overlay)(
  overlayClasses
);
export const StyledDialogOverlay = classed(Dialog.Overlay)(overlayClasses);

const styledDialogContent = ({ size = "sm" }: { size?: B3Size }) =>
  clsx(
    {
      "p-4": size === "sm",
      "p-0": size === "xs",
    },
    `fixed inline-block w-full
      max-h-screen
      text-left
      align-bottom
      bg-white dark:bg-gray-900
      dark:text-white
      shadow-md dark:shadow-none dark:border dark:border-black
      sm:rounded sm:align-middle sm:max-w-lg
      left-2/4 top-2/4 -translate-x-1/2 -translate-y-1/2
      overflow-y-auto placemark-scrollbar
      z-50
      `
  );

export const StyledDialogContent = classed(Dialog.Content)(styledDialogContent);
export const StyledAlertDialogContent = classed(AlertDialog.Content)(
  styledDialogContent
);

export const styledCheckbox = ({
  variant = "default",
}: {
  variant: B3Variant;
}) =>
  clsx([
    sharedOutline("primary"),
    {
      "text-purple-500 focus:ring-purple-500": variant === "primary",
      "text-gray-500 border-gray-500 hover:border-gray-700 dark:hover:border-gray-300 focus:ring-gray-500":
        variant === "default",
    },
    `bg-transparent rounded dark:ring-offset-gray-700`,
  ]);

export const FieldCheckbox = classed(Field)(styledCheckbox);

export const StyledDialogClose = () => (
  <Dialog.Close
    aria-label="Close"
    className="absolute top-4 right-4 text-gray-500"
  >
    <Cross1Icon />
  </Dialog.Close>
);

export const TContent = classed(Tooltip.Content)(
  ({ size = "sm" }: { size?: B3Size }) => [
    {
      "max-w-md": size === "sm",
      "w-64": size === "md",
    },
    `px-2 py-1 rounded
  z-50
  text-sm
  border
  shadow-sm
  text-gray-700          dark:text-white
  bg-white               dark:bg-gray-900
  border-gray-200        dark:border-gray-600
  `,
  ]
);

export function styledPropertyInput(
  side: "left" | "right" | "table",
  missing = false
) {
  return clsx(
    {
      "pl-3": side === "left",
      "pl-2": side === "right",
      "px-2": side === "table",
    },
    missing
      ? "text-gray-700 dark:text-gray-100 opacity-70"
      : "text-gray-700 dark:text-gray-100",
    `bg-transparent block tabular-nums text-xs border-none pr-1 py-2
    w-full
    focus-visible:ring-inset
    focus-visible:bg-purple-300/10 dark:focus-visible:bg-purple-700/40
    dark:focus-visible:ring-purple-700 focus-visible:ring-purple-500`
  );
}

export const styledTd = "border-gray-200 dark:border-gray-600";

const arrowLike = "text-white dark:text-gray-900 fill-current";

const ArrowSVG = (
  <svg>
    <polygon points="0,0 30,0 15,10" />
    <path
      d="M 0 0 L 15 10 L 30 0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-gray-200 dark:text-gray-600"
    />
  </svg>
);

export const StyledPopoverArrow = () => (
  <Popover.Arrow offset={5} width={11} height={5} className={arrowLike} asChild>
    {ArrowSVG}
  </Popover.Arrow>
);

export const StyledTooltipArrow = () => (
  <Tooltip.Arrow offset={5} width={11} height={5} className={arrowLike} asChild>
    {ArrowSVG}
  </Tooltip.Arrow>
);

export const StyledDropDownArrow = () => (
  <DD.Arrow offset={5} width={11} height={5} className={arrowLike} asChild>
    {ArrowSVG}
  </DD.Arrow>
);

export const StyledPopoverContent = classed(Popover.Content)(
  ({
    size = "sm",
    flush = "no",
  }: {
    size?: B3Size | "no-width";
    flush?: "yes" | "no";
  }) =>
    clsx(
      {
        "w-32": size === "xs",
        "w-64": size === "sm",
        "w-96": size === "md",
        "w-[36em]": size === "lg",
      },
      flush === "yes" ? "" : "p-3",
      `shadow-lg
      placemark-appear
      z-50
      bg-white dark:bg-gray-900
      dark:text-white
      border border-gray-200 dark:border-gray-700 rounded-md`
    )
);

export function PopoverContent2({
  children,
  ...props
}: React.ComponentProps<typeof StyledPopoverContent>) {
  return (
    <Popover.Portal>
      <StyledPopoverContent {...props}>
        <StyledPopoverArrow />
        {children}
      </StyledPopoverContent>
    </Popover.Portal>
  );
}

export const styledTextarea =
  "block w-full mt-1 text-sm font-mono border-gray-300 dark:bg-transparent dark:text-white rounded-sm focus-visible:border-gray-300 overflow-auto focus:ring-purple-500";

export const StyledFieldTextareaCode = classed(Field)(styledTextarea);

export const StyledLabelSpan = classed.span(
  ({ size = "sm" }: { size?: B3Size }) =>
    clsx(
      {
        "text-sm": size === "sm",
        "text-xs": size === "xs",
      },
      "text-gray-700 dark:text-gray-300 select-none"
    )
);

export const StyledFieldTextareaProse = classed(Field)(
  (
    {
      size = "md",
      variant = "default",
    }: { size: B3Size; variant: B3Variant } = { size: "sm", variant: "default" }
  ) =>
    clsx(
      sharedEqualPadding(size),
      sharedOutline(variant),
      "block w-full mt-1 focus-visible:border-gray-300 dark:bg-transparent dark:text-white"
    )
);

export const contentLike = `py-1
    bg-white dark:bg-gray-900
    rounded-sm
    shadow-[0_2px_10px_2px_rgba(0,0,0,0.1)]
    ring-1 ring-gray-200 dark:ring-gray-700
    content-layout z-50`;

export const DDContent = classed(DD.Content)(contentLike);
export const DDSubContent = classed(DD.SubContent)(contentLike);
export const CMContent = classed(CM.Content)(contentLike);
export const CMSubContent = classed(CM.SubContent)(contentLike);

const styledLabel =
  "block py-1 pl-3 pr-4 text-xs text-gray-500 dark:text-gray-300";

export const DivLabel = classed.div(styledLabel);
export const DDLabel = classed(DD.Label)(styledLabel);
export const StyledSelectLabel = classed(Select.Label)(styledLabel);

const styledSeparator = "border-t border-gray-100 dark:border-gray-700 my-1";

export const DivSeparator = classed.div(styledSeparator);
export const DDSeparator = classed(DD.Separator)(styledSeparator);
export const StyledSelectSeparator = classed(Select.Separator)(styledSeparator);

export const styledInlineA =
  "text-purple-700 underline hover:text-black dark:text-purple-500 dark:hover:text-purple-300";

export const menuItemLike = ({
  variant = "default",
}: {
  variant?: B3Variant;
}) =>
  clsx([
    {
      "text-black dark:text-gray-300": variant === "default",
      "text-red-500 dark:text-red-300": variant === "destructive",
    },
    `cursor-pointer
    hover:bg-gray-200 dark:hover:bg-gray-700
    focus-visible:bg-gray-100 dark:focus-visible:bg-gray-700
    flex items-center
    w-full
    py-1 pl-3 pr-3
    text-sm gap-x-2`,
  ]);

export const StyledButtonItem = classed.div(menuItemLike);
export const StyledRadioItem = classed(DD.RadioItem)(menuItemLike);
export const StyledItem = classed(DD.Item)(menuItemLike);
export const StyledSelectItem = classed(Select.Item)(menuItemLike);
export const StyledMenuLink = React.forwardRef(
  (
    {
      children,
      variant = "default",
      ...attributes
    }: {
      children: React.ReactNode;
      variant?: B3Variant;
    } & React.HTMLAttributes<HTMLAnchorElement>,
    ref: React.ForwardedRef<HTMLAnchorElement>
  ) => {
    return (
      <a
        className={menuItemLike({ variant })}
        ref={ref}
        {...attributes}
        onClick={(e) => {
          attributes.onClick?.(e);
          try {
            document.dispatchEvent(
              new KeyboardEvent("keydown", { key: "Escape" })
            );
          } catch (e) {
            Sentry.captureException(e);
          }
        }}
      >
        {children}
      </a>
    );
  }
);
export const DDSubTriggerItem = classed(DD.SubTrigger)(menuItemLike);
export const CMSubTriggerItem = classed(CM.SubTrigger)(
  menuItemLike({ variant: "default" }) + " justify-between"
);
export const CMItem = classed(CM.Item)(menuItemLike);

export const StyledPopoverCross = () => (
  <Popover.Close
    className="flex
  focus-visible:text-black dark:focus-visible:text-white
  text-gray-500 dark:text-gray-300
  hover:text-black dark:hover:text-white"
  >
    <Cross1Icon className="w-3 h-3" />
  </Popover.Close>
);

export const PopoverTitleAndClose = ({ title }: { title: string }) => (
  <div className="flex items-start justify-between pb-2">
    <StyledLabelSpan>{title}</StyledLabelSpan>
  </div>
);

export type B3Size = "xxs" | "xs" | "sm" | "md" | "lg";
export type B3Variant =
  | "default"
  | "primary"
  | "quiet"
  | "code"
  | "quiet/mode"
  | "destructive";
export type B3Side = "default" | "left" | "right" | "middle";

export const sharedPadding = (
  size: B3Size,
  side: B3Side = "default"
): ClassValue => ({
  "p-0 text-xs rounded-sm": size === "xxs",
  "py-0.5 px-1.5 text-xs rounded-sm": size === "xs",
  "py-1 px-2 text-sm rounded": size === "sm",
  "py-1 px-3 text-md rounded": size === "md",
  "rounded-l-none": side === "right",
  "rounded-r-none": side === "left",
  "rounded-none": side === "middle",
});

export const sharedEqualPadding = (size: B3Size): ClassValue => ({
  "p-1.5 text-xs rounded-sm": size === "xs",
  "p-2 text-sm rounded": size === "sm",
  "p-3 text-md rounded": size === "md",
});

export const styledRadio = clsx(
  "text-purple-500 dark:bg-transparent dark:checked:bg-purple-500 focus:ring-purple-500",
  sharedOutline("primary")
);

/**
 * Shared by select and buttons
 */
export function sharedOutline(
  variant: B3Variant,
  disabled = false
): ClassValue {
  return [
    `
    outline-none

  `,
    disabled
      ? ""
      : `focus-visible:ring-1
    focus-visible:ring-offset-1
    focus-visible:ring-purple-500
    dark:focus-visible:ring-purple-500
    dark:focus-visible:ring-offset-gray-900`,

    {
      [`border border-purple-500`]: variant === "primary",
      [`border
    border-gray-200               dark:border-gray-500
    shadow-sm
  `]: variant === "default",

      [`
    focus-visible:border-gray-200   dark:focus-visible:border-gray-300
    hover:border-gray-300   dark:hover:border-gray-300
    `]: variant === "default" && !disabled,

      [`border
    border-red-200               dark:border-red-300
  `]: variant === "destructive",

      [`
    focus-visible:border-red-500   dark:focus-visible:border-red-300
    hover:border-red-300   dark:hover:border-red-300
  `]: variant === "destructive" && !disabled,
    },
  ];
}

const sharedBackground = (variant: B3Variant, disabled = false): ClassValue => {
  switch (variant) {
    case "primary":
    case "code":
      return [
        `bg-purple-500`,
        !disabled &&
          `hover:bg-purple-600 dark:hover:bg-purple-400 hover:shadow`,
      ];
    case "default":
      return !disabled && `hover:bg-gray-100 dark:hover:bg-gray-800`;
    case "quiet":
      return !disabled && `hover:bg-gray-200 dark:hover:bg-gray-700`;
    case "quiet/mode":
      return !disabled && `hover:bg-gray-200 dark:hover:bg-gray-700`;
    case "destructive":
      return !disabled && `hover:bg-red-500/10 dark:hover:bg-red-500/20`;
  }
};

const sharedText = (variant: B3Variant): ClassValue => {
  switch (variant) {
    case "quiet":
    case "code":
    case "quiet/mode":
    case "default": {
      return "font-medium text-gray-700 dark:text-white";
    }
    case "primary": {
      return "font-medium text-white";
    }
    case "destructive": {
      return "font-medium text-red-500 dark:text-red-300";
    }
  }
};

export const styledButton = ({
  size = "sm",
  variant = "default",
  disabled = false,
  side = "default",
}: {
  size?: B3Size | "full-width";
  variant?: B3Variant;
  disabled?: boolean;
  side?: B3Side;
}) =>
  clsx(
    variant === "quiet/mode"
      ? `aria-expanded:bg-purple-400 aria-expanded:text-white
      dark:aria-expanded:bg-purple-600
    data-state-on:bg-purple-400 dark:data-state-on:bg-gray-900`
      : variant === "primary"
      ? `aria-expanded:bg-purple-600
    data-state-on:bg-purple-600`
      : `
    aria-expanded:bg-gray-200 dark:aria-expanded:bg-black
    data-state-on:bg-gray-200 dark:data-state-on:bg-gray-600`,
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "transition-colors",
    // Focus
    `focus-visible:outline-none`,
    // Sizing
    sharedPadding(size === "full-width" ? "md" : size, side),
    // Display
    `inline-flex items-center gap-x-1`,
    // Transition
    // `transition-all`,
    // Text
    sharedText(variant),
    // Outline
    sharedOutline(variant, disabled),
    sharedBackground(variant, disabled),
    size === "full-width" && "flex-auto justify-center",
    // Colored variants
    {}
  );

export const styledPanelTitle = ({
  interactive = false,
}: {
  interactive?: boolean;
}) =>
  clsx(
    `text-sm
  w-full
  text-gray-700 dark:text-gray-300
  flex justify-between items-center`,
    "px-3 py-3",
    interactive && `hover:text-gray-900 dark:hover:text-white`
  );

export const Button = classed.button(styledButton);

// TODO: all kinds of issues with select. Change to styled soon.
export const styledSelect = ({
  size,
  variant = "default",
}: {
  size: B3Size;
  variant?: B3Variant;
}) =>
  clsx([
    sharedPadding(size),
    sharedOutline(variant),
    sharedText("default"),
    `
    pr-8
    bg-transparent

    focus-visible:bg-white
    active:bg-white

    dark:focus-visible:bg-black
    dark:active:bg-black
    `,
  ]);

export const inputClass = ({
  _size = "sm",
  variant = "default",
}: {
  _size?: B3Size;
  variant?: B3Variant;
}) =>
  clsx([
    sharedPadding(_size),
    sharedOutline("default"),
    {
      "font-mono": variant === "code",
    },
    `block w-full
    dark:bg-transparent dark:text-gray-100`,
  ]);

export const Keycap = classed.div(({ size = "sm" }: { size?: B3Size }) => [
  {
    "text-sm px-2": size === "sm",
    "text-xs px-1": size === "xs",
  },
  `text-center
  dark:bg-gray-700/50
  font-mono rounded
  ring-1 ring-gray-100 dark:ring-black
  border border-b-4 border-r-2
  border-gray-300 dark:border-gray-500`,
]);

export const Input = classed.input(inputClass);
export const StyledField = classed(Field)(inputClass);

export const TextWell = classed.div(
  ({
    size = "sm",
    variant = "default",
  }: {
    size?: B3Size;
    variant?: B3Variant;
  }) =>
    clsx({
      "text-sm": size === "sm",
      "py-2 px-3":
        (variant === "destructive" || variant === "primary") && size === "sm",
      "py-1 px-2":
        (variant === "destructive" || variant === "primary") && size === "xs",
      "text-xs": size === "xs",
      "text-gray-700 dark:text-gray-300": variant === "default",
      "text-red-700 dark:text-red-100 bg-red-50 dark:bg-red-900 rounded":
        variant === "destructive",
      "bg-gray-50 border border-gray-200 dark:bg-gray-900 dark:border-gray-700 rounded":
        variant === "primary",
    })
);

export const StyledSwitch = classed(S.Root)(
  `w-10 h-5 relative rounded-full
  bg-gray-200 dark:bg-black
  data-state-checked:bg-gray-600 dark:data-state-checked:bg-gray-600
  dark:ring-1 dark:ring-gray-400
  transition-all`
);
export const StyledThumb = classed(S.Thumb)(
  `w-5 h-5 border-2
  border-gray-200 dark:border-black
  data-state-checked:border-gray-600 dark:data-state-checked:border-gray-600
  rounded-full bg-white transition-all block shadow-sm data-state-checked:translate-x-5`
);

export const StyledPopoverTrigger = classed(Popover.Trigger)(
  clsx(
    `aria-expanded:bg-gray-200 dark:aria-expanded:bg-gray-900
    data-state-on:bg-gray-200 dark:data-state-on:bg-gray-600`,
    "disabled:opacity-50 disabled:cursor-not-allowed",
    // Focus
    `focus-visible:outline-none`,
    // Sizing
    `py-1 px-1 rounded text-sm`,
    // Display
    `relative w-full flex items-center gap-x-1`,
    // Transition
    // `transition-all`,
    // Text
    sharedText("default"),
    // Outline
    sharedOutline("default", false),
    sharedBackground("default", false),
    // Colored variants
    {}
  )
);

export const H1 = classed.h2("font-bold text-2xl");
export const H2 = classed.h2("font-bold text-xl");

export const MinimalHeaderLogoLink = () => {
  return (
    <Link
      href="/"
      className="py-1 pl-1 pr-2
                      flex
                      gap-x-2
                      items-center
                      dark:hover:bg-gray-700
                      focus-visible:ring-1 focus-visible:ring-purple-300
                      text-purple-500 hover:text-purple-700 dark:hover:text-purple-300"
      title="Home"
    >
      <PlacemarkIcon className="w-8 h-8" />
      <Placemark className="hidden sm:block w-24 text-gray-700 dark:text-gray-300" />
    </Link>
  );
};

export const MinimalHeader = () => {
  return (
    <div className="flex border-b dark:border-black border-gray-200">
      <nav className="w-full max-w-4xl mx-auto flex items-center flex-auto gap-x-2 py-2">
        <MinimalHeaderLogoLink />
      </nav>
    </div>
  );
};

export function Table({ children }: React.PropsWithChildren<unknown>) {
  return (
    <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
      <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
        <div className="overflow-hidden ring-1 ring-gray-300 dark:ring-gray-500 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
            {children}
          </table>
        </div>
      </div>
    </div>
  );
}

export function TableHead({ children }: React.PropsWithChildren<unknown>) {
  return (
    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200">
      <tr>{children}</tr>
    </thead>
  );
}

export const Th = classed.td(({ first = false }: { first?: boolean }) =>
  clsx(
    "py-2 pr-3 text-left text-sm font-semibold",
    first ? "pl-4 sm:pl-6" : "px-3"
  )
);

export const Td = classed.td(({ first = false }: { first?: boolean }) => {
  return clsx(
    "whitespace-nowrap py-3 pl-4 pr-3 text-sm font-medium",
    first && "sm:pl-6"
  );
});

export const Tbody = classed.tbody(
  "divide-y divide-gray-200 dark:divide-gray-500 bg-white dark:bg-gray-800"
);

export const VisibilityToggleIcon = ({
  visibility,
}: {
  visibility: boolean;
}) => {
  return visibility ? <EyeOpenIcon /> : <EyeNoneIcon />;
};
