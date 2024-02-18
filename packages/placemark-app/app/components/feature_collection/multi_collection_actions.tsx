import { invalidateQuery, useMutation } from "@blitzjs/rpc";
import clsx from "clsx";
import { Button } from "app/components/elements";
import combineWrappedFeatureCollections from "app/wrappedFeatureCollections/mutations/combineWrappedFeatureCollections";
import toast from "react-hot-toast";
import getWrappedFeatureCollectionTree from "app/wrappedFeatureCollections/queries/getWrappedFeatureCollectionTree";
import deleteWrappedFeatureCollectionsAndFoldersMutation from "app/wrappedFeatureCollections/mutations/deleteWrappedFeatureCollectionsAndFolders";
import { validate } from "uuid";

export function MultiCollectionActions({
  selectedCollections,
  onClear,
}: {
  selectedCollections: string[];
  onClear: () => void;
}) {
  const [deleteWrappedFeatureCollectionsAndFolders] = useMutation(
    deleteWrappedFeatureCollectionsAndFoldersMutation
  );
  const [combineWrappedFeatureCollectionsMutation] = useMutation(
    combineWrappedFeatureCollections
  );
  return (
    <div
      className={clsx(
        selectedCollections.length ? "opacity-100" : "opacity-0",
        `flex items-center gap-x-2 p-1`
      )}
    >
      {selectedCollections.filter((id) => !validate(id)).length > 1 ? (
        <>
          <Button
            size="xs"
            onClick={async () => {
              await toast.promise(
                (async () => {
                  await combineWrappedFeatureCollectionsMutation({
                    ids: selectedCollections.filter((id) => !validate(id)),
                  });
                  await invalidateQuery(getWrappedFeatureCollectionTree, {});
                  onClear();
                })(),
                {
                  loading: "Combining maps",
                  error: "Failed to combine maps",
                  success: "Combined maps",
                }
              );
            }}
          >
            Combine
          </Button>
          <div className="border-r h-4 border-gray-300 dark:border-gray-600" />
        </>
      ) : null}
      <Button
        variant="destructive"
        size="xs"
        onClick={async () => {
          if (
            !confirm("Are you sure you want to permanently delete these maps?")
          ) {
            return;
          }
          await toast.promise(
            (async () => {
              await deleteWrappedFeatureCollectionsAndFolders({
                ids: selectedCollections,
              });
              await invalidateQuery(getWrappedFeatureCollectionTree, {});
              onClear();
            })(),
            {
              loading: "Deleting maps",
              error: "Failed to delete maps",
              success: "Deleted maps",
            }
          );
        }}
      >
        Delete
      </Button>
    </div>
  );
}
