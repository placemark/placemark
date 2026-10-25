import { Autocomplete } from "@base-ui/react/autocomplete";
import { useQuery } from "@tanstack/react-query";
import {
  contentLike,
  inputClass,
  StyledLabelSpan,
} from "app/components/elements";
import {
  type HandleSuggestion,
  searchHandles,
} from "app/lib/cloud_providers/atproto/handle_search";
import clsx from "clsx";
import { useFormikContext } from "formik";
import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { themeAtom } from "state/jotai";

function itemToStringValue(actor: HandleSuggestion): string {
  return actor.handle;
}

/**
 * The handle field for cloud sign-in, with Bluesky's public actor-search
 * typeahead wired in (same endpoint bsky.app itself uses) so people can
 * find their handle instead of typing it exactly.
 */
export function HandleCombobox() {
  const { values, setFieldValue } = useFormikContext<{ handle: string }>();
  const theme = useAtomValue(themeAtom);

  // This dialog is opened by selecting an item in the "File" DropdownMenu,
  // which (on close) returns focus to its own trigger button -- and does
  // so after a same-tick `useEffect` focus call here, winning the race
  // and leaving focus on the menu trigger instead of this input. Deferring
  // to the next animation frame runs after that settles. Verified with a
  // real browser (not just reasoned about): a synchronous `useEffect`
  // focus call here measurably loses this race, a rAF-deferred one wins it.
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const { data: suggestions = [] } = useQuery({
    queryKey: ["atproto-handle-search", values.handle],
    queryFn: ({ signal }) => searchHandles(values.handle, signal),
    enabled: values.handle.trim().length > 1,
    placeholderData: (previous) => previous,
  });

  return (
    <div className="pb-2 space-y-2">
      <label>
        <div className="pb-1">
          <StyledLabelSpan size="sm">Handle</StyledLabelSpan>
        </div>
        <Autocomplete.Root
          items={suggestions}
          filter={null}
          itemToStringValue={itemToStringValue}
          value={values.handle}
          onValueChange={(value) => void setFieldValue("handle", value)}
        >
          <Autocomplete.Input
            ref={inputRef}
            name="handle"
            spellCheck={false}
            autoCapitalize="false"
            autoComplete="username"
            data-1p-ignore
            data-lpignore="true"
            data-bwignore
            placeholder="you.bsky.social"
            className={inputClass({ _size: "sm" })}
          />
          {suggestions.length > 0 ? (
            <Autocomplete.Portal>
              <Autocomplete.Positioner
                side="bottom"
                align="start"
                sideOffset={4}
                // This is the element actually positioned (fixed/absolute)
                // against the dialog's own z-50 stacking -- the inner
                // Popup's z-50 (from contentLike) only matters within the
                // stacking context this element establishes, not against
                // the dialog itself.
                //
                // `dark` here, not just inherited: this portals to
                // document.body, outside the `.dark`-classed <main> that
                // Tailwind's dark: variant is scoped to
                // (`@custom-variant dark (&:where(.dark, .dark *))`), so
                // dark: utilities below would otherwise never match.
                className={clsx(
                  "z-50 w-(--anchor-width)",
                  theme === "dark" && "dark",
                )}
              >
                <Autocomplete.Popup
                  className={clsx(
                    contentLike,
                    // The modal dialog disables pointer events on the rest
                    // of the page (document.body gets pointer-events:
                    // none) and only re-enables them for elements it
                    // recognizes as its own layers. This popup is
                    // portaled outside that dialog, so without this
                    // override, clicks on it never reach the browser's
                    // event dispatch at all.
                    "pointer-events-auto max-h-48 overflow-y-auto",
                  )}
                >
                  <Autocomplete.List>
                    {(actor: HandleSuggestion) => (
                      <Autocomplete.Item
                        key={actor.did}
                        value={actor}
                        className="flex w-full cursor-pointer items-center gap-x-2 py-1 pl-3 pr-3 text-sm text-black data-[highlighted]:bg-gray-100 dark:text-gray-300 dark:data-[highlighted]:bg-gray-700"
                      >
                        {actor.avatar ? (
                          <img
                            src={actor.avatar}
                            alt=""
                            className="h-5 w-5 shrink-0 rounded-full"
                          />
                        ) : (
                          <div className="h-5 w-5 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate">@{actor.handle}</div>
                          {actor.displayName ? (
                            <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                              {actor.displayName}
                            </div>
                          ) : null}
                        </div>
                      </Autocomplete.Item>
                    )}
                  </Autocomplete.List>
                </Autocomplete.Popup>
              </Autocomplete.Positioner>
            </Autocomplete.Portal>
          ) : null}
        </Autocomplete.Root>
      </label>
    </div>
  );
}
