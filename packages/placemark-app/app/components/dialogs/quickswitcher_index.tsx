import { useMemo, useState } from "react";
import { QItem } from "app/lib/geocode";
import { ArrowDownIcon, PlusIcon } from "@radix-ui/react-icons";
import { Combobox } from "@headlessui/react";
import Fuse from "fuse.js";
import {
  comboboxFooterClass,
  comboboxInputClass,
  ResultsOptions,
} from "app/components/dialogs/quickswitcher_shared";
import { useQuery } from "@blitzjs/rpc";
import getWrappedFeatureCollectionTree from "app/wrappedFeatureCollections/queries/getWrappedFeatureCollectionTree";
import { collectChildren } from "app/lib/tree";
import { useRouter } from "next/router";
import { Routes } from "@blitzjs/next";
import { useCreateMap } from "app/hooks/use_create_map";

interface IndexResults {
  wfcAndFolders: QItem[];
  actions: QItem[];
}

export function QuickswitcherIndexDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState<string>("");
  const [tree] = useQuery(getWrappedFeatureCollectionTree, {});

  const children = Array.from(collectChildren(tree));

  const { createMap } = useCreateMap();

  const actionOptions = [
    {
      label: "Create map",
      applicable: true,
      icon: <PlusIcon />,
      onSelect: () => {
        return createMap();
      },
    },
  ];

  const searchIndex = useMemo(() => {
    return new Fuse(children, {
      keys: ["data.name"],
      isCaseSensitive: false,
      includeMatches: true,
      // child => child.name,
      threshold: 0.2,
      ignoreLocation: true,
    });
  }, [children]);

  const wfcAndFolders = searchIndex
    .search(query, {
      limit: 5,
    })
    .map((result) => {
      return result.item;
    });

  const actions = new Fuse(actionOptions, {
    keys: ["label"],
    isCaseSensitive: false,
    threshold: 0.2,
    ignoreLocation: true,
  })
    .search(query, {
      limit: 5,
    })
    .map((result): QItem => {
      return {
        type: "action",
        action: result.item,
      };
    });

  const list = {
    wfcAndFolders,
    actions,
  };

  return (
    <div aria-label="Search" className="relative w-full">
      <Combobox
        value={null as QItem | null}
        onChange={async (item) => {
          if (item) {
            onClose();
            switch (item.type) {
              case "container": {
                await router.push(
                  Routes.PlacemarkIndex({ parent: item.data.id })
                );
                break;
              }
              case "leaf": {
                await router.push(
                  Routes.PersistedMap({
                    wrappedFeatureCollectionId: item.data.id,
                  })
                );
                break;
              }
              case "action": {
                void item.action.onSelect();
                break;
              }
              default: {
                // Pass
              }
            }
          }
        }}
      >
        <Combobox.Input
          ref={(input: any) => {
            (input as HTMLInputElement)?.focus();
          }}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          spellCheck={false}
          id="search-geocoder"
          aria-label="Search"
          className={comboboxInputClass}
        />
        <Combobox.Options className="bg-white dark:bg-gray-900">
          <ResultsOptions
            results={list.wfcAndFolders}
            title="Maps and folders"
          />
          <ResultsOptions results={list.actions} title="Actions" />
        </Combobox.Options>
      </Combobox>

      <div className={comboboxFooterClass}>
        {hasResults(list) ? (
          <>
            <ArrowDownIcon /> Navigate options
          </>
        ) : (
          <>Type to search…</>
        )}
      </div>
    </div>
  );
}

/**
 * Note: this needs to be updated if `results` ever gets another
 * section.
 */
function hasResults(results: IndexResults | undefined): boolean {
  if (!results) return false;
  return !!(results.wfcAndFolders.length || results.actions.length);
}
