import { ClipboardIcon } from "@radix-ui/react-icons";
import addedFeaturesToast from "app/components/added_features_toast";
import { CoordinateStringOptionsForm } from "app/components/coordinate_string_options_form";
import { CsvOptionsForm } from "app/components/csv_options_form";
import { DialogHeader } from "app/components/dialog";
import SimpleDialogActions from "app/components/dialogs/simple_dialog_actions";
import { StyledFieldTextareaCode } from "app/components/elements";
import { SelectFileType } from "app/components/fields";
import { GeoreferenceOptionsForm } from "app/components/georeference_options_form";
import { MapContext } from "app/context/map_context";
import { useImportString } from "app/hooks/use_import";
import type { ImportOptions, Progress } from "app/lib/convert";
import { DEFAULT_IMPORT_OPTIONS } from "app/lib/convert";
import * as Comlink from "comlink";
import type { FormikHelpers } from "formik";
import { Form, Formik } from "formik";
import { captureException } from "integrations/errors";
import type { LngLatBoundsLike } from "maplibre-gl";
import { useContext, useState } from "react";
import type { DialogStateLoadText } from "state/dialog_state";
import { AutoDetectText } from "./autodetect";
import { ImportProgressBar } from "./import/import_progress_bar";
import { getImportExtent } from "./import_utils";

interface ImportOptionsWithText extends ImportOptions {
  text: string;
}

export function ImportTextDialog({
  modal,
  onClose,
}: {
  modal: DialogStateLoadText;
  onClose: () => void;
}) {
  const doImport = useImportString();
  const map = useContext(MapContext);
  const [progress, setProgress] = useState<Progress | null>(null);

  async function onSubmit(
    values: ImportOptionsWithText,
    helpers: FormikHelpers<ImportOptionsWithText>,
  ) {
    try {
      const { text, ...options } = values;
      await (
        await doImport(
          text,
          options,
          Comlink.proxy((newProgress) => {
            setProgress(newProgress);
          }),
        )
      ).caseOf({
        Left(e) {
          helpers.setErrors({
            type: e.message,
          });
        },
        async Right(pendingResult) {
          const result = await pendingResult;
          getImportExtent(result).map((extent) => {
            map?.map.fitBounds(extent as LngLatBoundsLike, { padding: 100 });
          });
          addedFeaturesToast(result);
          onClose();
        },
      });
    } catch (e: any) {
      captureException(e);
      helpers.setErrors({
        type: e.message,
      });
    }
  }

  return (
    <>
      <DialogHeader title="Import text" titleIcon={ClipboardIcon} />
      <Formik
        onSubmit={onSubmit}
        initialValues={{
          ...DEFAULT_IMPORT_OPTIONS,
          type: "geojson",
          text: modal.initialValue || "",
          toast: true,
        }}
      >
        {({ values }) => (
          <Form>
            <div>
              <div>
                <div className="space-y-4">
                  <StyledFieldTextareaCode
                    aria-label="Data"
                    as="textarea"
                    name="text"
                    autoFocus
                  />
                  <SelectFileType textOnly />
                  <GeoreferenceOptionsForm />
                  <CoordinateStringOptionsForm />
                  <CsvOptionsForm file={values.text} geocoder />
                </div>
              </div>
              <SimpleDialogActions onClose={onClose} action="Import" />
              <ImportProgressBar progress={progress} />
              <AutoDetectText />
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
}
