import { Field, ErrorMessage } from "formik";
import { InlineError } from "./inline_error";
import { styledSelect } from "./elements";
import type { Root } from "@tmcw/togeojson";
import { useFolderSummary } from "./panels/feature_editor/feature_editor_folder/math";
import { pluralize } from "app/lib/utils";
import { FeatureMap } from "types";

export function NarrowExport({
  root,
  featureMap,
}: {
  root: Root;
  featureMap: FeatureMap;
}) {
  const folderSummary = useFolderSummary({ root, featureMap });
  return (
    <>
      <label className="block pt-2 space-y-2">
        <div className="text-sm text-gray-700 dark:text-gray-300 flex items-center justify-between">
          Choose features
        </div>
        <Field
          as="select"
          name="folderId"
          aria-label="File format"
          className={styledSelect({ size: "md" }) + "w-full"}
        >
          {folderSummary.map((folder, i) => {
            return (
              <option key={i} value={folder.meta.id as string}>
                {folder.meta.name as string} (
                {pluralize("feature", folder.meta.count as number)})
              </option>
            );
          })}
        </Field>
      </label>
      <ErrorMessage name="folderId" component={InlineError} />
    </>
  );
}
