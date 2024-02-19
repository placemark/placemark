import Head from "next/head";
import Link from "next/link";
import { useQuery } from "@blitzjs/rpc";
import { ErrorBoundary, Routes } from "@blitzjs/next";
import type PMap from "app/lib/pmap";
import { MapComponentPublic } from "app/components/map_component_public";
import React, { useMemo, useState } from "react";
import { MapContext } from "app/context/map_context";
import { Legend } from "app/components/legend";
import {
  Button,
  PlacemarkIcon,
  PopoverContent2,
  styledButton,
} from "./elements";
import { usePersistence } from "app/lib/persistence/context";
import { PersistenceMetadataPersisted } from "app/lib/persistence/ipersistence";
import { formatTitle, pluralize } from "app/lib/utils";
import { Dialogs } from "./dialogs";
import { dialogAtom } from "state/dialog_state";
import {
  InfoCircledIcon,
  TriangleDownIcon,
  TriangleRightIcon,
} from "@radix-ui/react-icons";
import * as P from "@radix-ui/react-popover";
import * as C from "@radix-ui/react-collapsible";
import { FeatureTableStats } from "./panels/feature_table/feature_table_stats";
import { dataAtom } from "state/jotai";
import { USelection } from "state";
import clsx from "clsx";
// import { FeatureEditorGeometry } from "./panels/feature_editor/feature_editor_geometry";
import { PanelDetails } from "./panel_details";
import { FeatureEditorPropertiesReadonly } from "./panels/feature_editor/feature_editor_properties";
import getCanAccessWrappedFeatureCollection from "app/wrappedFeatureCollections/queries/getCanAccessWrappedFeatureCollection";
import { FeatureEditorGeometry } from "app/components/panels/feature_editor/feature_editor_geometry";
import { useSetAtom, useAtomValue } from "jotai";

function SigninOrEdit() {
  return (
    <ErrorBoundary
      fallback={
        <Link
          href={Routes.SigninPage()}
          className={styledButton({ variant: "primary", size: "sm" })}
        >
          Sign in
        </Link>
      }
    >
      <Edit />
    </ErrorBoundary>
  );
}

function Edit() {
  const rep = usePersistence();
  const meta = rep.useMetadata()[0];
  useQuery(getCanAccessWrappedFeatureCollection, {
    id: (meta.type === "persisted" && meta.id) || "",
  });
  if (meta.type !== "persisted") return null;
  return (
    <Link
      href={Routes.PersistedMap({ wrappedFeatureCollectionId: meta.id })}
      className={styledButton({ variant: "primary", size: "sm" })}
    >
      Edit
    </Link>
  );
}

function FeatureInfo() {
  const data = useAtomValue(dataAtom);
  const selectedFeatures = USelection.getSelectedFeatures(data);
  const [isOpen, setIsOpen] = useState<boolean>(true);

  return (
    <div
      className={clsx(
        `absolute top-4 left-4
            overflow-auto placemark-scrollbar
            border border-gray-300
            bg-white py-2
            shadow-md rounded
            w-80`,
        selectedFeatures.length ? "opacity-100" : "opacity-0"
      )}
      style={{
        maxHeight: "calc(100vh - 48px - 32px)",
      }}
    >
      <C.Root
        open={!!selectedFeatures.length && isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
        }}
      >
        <C.Trigger asChild>
          <button className="flex items-center py-2 mx-3 gap-x-2 group">
            <div className="p-1 bg-gray-100 rounded group-hover:bg-gray-300 transition">
              {isOpen ? <TriangleDownIcon /> : <TriangleRightIcon />}
            </div>
            {pluralize("feature", selectedFeatures.length)} selected
          </button>
        </C.Trigger>
        <C.Content className="overflow-auto placemark-scrollbar">
          {selectedFeatures.length ? (
            <div className="pt-4">
              {selectedFeatures.length === 1 ? (
                <PanelDetails title="Properties" variant="fullwidth">
                  <FeatureEditorPropertiesReadonly
                    wrappedFeature={selectedFeatures[0]}
                  />
                </PanelDetails>
              ) : null}
              <PanelDetails title="Geometry">
                <FeatureEditorGeometry wrappedFeatures={selectedFeatures} />
              </PanelDetails>
            </div>
          ) : null}
        </C.Content>
      </C.Root>
    </div>
  );
}

export function PlacemarkInnerPublic({
  initialExtent,
}: {
  initialExtent: BBox4;
}) {
  const [map, setMap] = useState<PMap | null>(null);
  const rep = usePersistence();
  const meta = rep.useMetadata()[0] as PersistenceMetadataPersisted;
  const setDialogState = useSetAtom(dialogAtom);
  const data = useAtomValue(dataAtom);

  const features = useMemo(() => {
    return [...data.featureMap.values()];
  }, [data]);

  return (
    <>
      <Head>
        <title>{formatTitle(meta.name)}</title>
      </Head>
      <MapContext.Provider value={map}>
        <div
          className="pr-4 flex items-center justify-between h-12 text-black
        shadow-xl"
        >
          <Link
            href="https://placemark.io/"
            className="py-1 pl-4 pr-2
        dark:hover:bg-gray-700
        focus-visible:ring-1 focus-visible:ring-purple-300
        text-purple-500 hover:text-purple-700 dark:hover:text-purple-300"
            title="Home"
          >
            <PlacemarkIcon className="w-8 h-8" />
          </Link>
          <div className="whitespace-nowrap truncate">{meta.name}</div>
          <div className="w-2" />
          <P.Root>
            <P.Trigger asChild>
              <Button variant="quiet">
                <InfoCircledIcon />
              </Button>
            </P.Trigger>
            <PopoverContent2 size="md">
              <FeatureTableStats features={features} />
            </PopoverContent2>
          </P.Root>
          <div className="w-4" />
          <Button
            onClick={() => {
              setDialogState({
                type: "export",
              });
            }}
          >
            Download
          </Button>
          <div className="flex-auto" />
          <div className="w-2" />
          <SigninOrEdit />
        </div>
        <div className="flex flex-auto relative border-t border-gray-300">
          <div className="relative flex-auto flex flex-col">
            <div className="flex-auto relative">
              <MapComponentPublic
                setMap={setMap}
                initialExtent={initialExtent}
              />
            </div>
            <Legend />
          </div>
          <FeatureInfo />
        </div>
        <Dialogs />
      </MapContext.Provider>
    </>
  );
}
