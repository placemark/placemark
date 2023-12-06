import Head from "next/head";
import { useMutation } from "@blitzjs/rpc";
import { Routes } from "@blitzjs/next";
import { useRouter } from "next/router";
import * as P from "@radix-ui/react-popover";
import * as Sentry from "@sentry/nextjs";
import type { PersistenceMetadataMemory } from "app/lib/persistence/ipersistence";
import createWrappedFeatureCollectionWithFeaturesMutation from "app/wrappedFeatureCollections/mutations/createWrappedFeatureCollectionWithFeatures";
import {
  Button,
  StyledPopoverArrow,
  StyledPopoverContent,
  StyledPopoverCross,
} from "app/components/elements";
import React from "react";
import { useAtomValue } from "jotai";
import { dataAtom } from "state/jotai";
import toast from "react-hot-toast";
import { formatTitle } from "app/lib/utils";
import { UNTITLED } from "app/lib/constants";

export function MemoryInfo({
  metadata: _metadata,
}: {
  metadata: PersistenceMetadataMemory;
}) {
  const Router = useRouter();
  const data = useAtomValue(dataAtom);
  const [createWrappedFeatureCollectionWithFeatures] = useMutation(
    createWrappedFeatureCollectionWithFeaturesMutation
  );

  function saveAsMap() {
    void toast.promise(
      createWrappedFeatureCollectionWithFeatures({
        name: UNTITLED,
        wrappedFeatures: Array.from(data.featureMap.values()),
        folders: Array.from(data.folderMap.values()),
      })
        .then((id) => {
          return Router.push(
            Routes.PersistedMap({ wrappedFeatureCollectionId: id })
          );
        })
        .catch((e) => {
          Sentry.captureException(e);
          throw e;
        }),
      {
        loading: "Saving…",
        success: "Saved as map",
        error: "Failed to save map",
      }
    );
  }

  return (
    <>
      <Head>
        <title>{formatTitle("Scratchpad")}</title>
      </Head>
      <P.Root>
        <P.Trigger className="flex items-center self-center text-xs justify-self-center">
          <div className="justify-self-center text-sm text-gray-500 dark:text-gray-300 hover:text-black dark:hover:text-white flex items-center">
            Draft
          </div>
        </P.Trigger>
        <StyledPopoverContent>
          <StyledPopoverArrow />
          <div className="flex justify-between">
            <div>
              <div className="text-sm pb-2">
                This map isn't synced to Placemark. Save it to a file or copy
                the contents when you're done editing.
              </div>
              <Button type="button" size="sm" onClick={saveAsMap}>
                Save to Placemark
              </Button>
            </div>
            <StyledPopoverCross />
          </div>
        </StyledPopoverContent>
      </P.Root>
    </>
  );
}
