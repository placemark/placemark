import { Routes } from "@blitzjs/next";
import { useMutation } from "@blitzjs/rpc";
import { useParent } from "app/hooks/use_parent";
import { UNTITLED } from "app/lib/constants";
import createWrappedFeatureCollectionMutation from "app/wrappedFeatureCollections/mutations/createWrappedFeatureCollection";
import { useRouter } from "next/router";
import { useState, useCallback } from "react";
import toast from "react-hot-toast";

export function useCreateMap() {
  const [createWrappedFeatureCollection] = useMutation(
    createWrappedFeatureCollectionMutation
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const router = useRouter();
  const parent = useParent();
  return {
    createMap: useCallback(async () => {
      setIsSubmitting(true);
      await toast.promise(
        (async () => {
          try {
            const map = await createWrappedFeatureCollection({
              name: UNTITLED,
              folderId: parent,
            });
            await router.push(
              Routes.PersistedMap({ wrappedFeatureCollectionId: map })
            );
          } catch (e: any) {
            if (e.name === "QuotaError") {
              toast.error(e.message as string);
            }
            setIsSubmitting(false);
            throw e;
          }
        })(),
        {
          loading: "Creating map",
          success: "Created map",
          error: "Failed to create map",
        }
      );
    }, [router, createWrappedFeatureCollection, parent]),
    isSubmitting,
  };
}
