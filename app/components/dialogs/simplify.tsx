import type { DialogStateSimplify } from "state/dialog_state";
import { FieldCheckbox, StyledLabelSpan } from "app/components/elements";
import SimpleDialogActions from "app/components/dialogs/simple_dialog_actions";
import { Field, Form, Formik } from "formik";
import { simplify } from "app/lib/map_operations/simplify";
import { usePersistence } from "app/lib/persistence/context";
import Line from "app/components/icons/line";
import * as Sentry from "@sentry/nextjs";
import { DialogHeader } from "app/components/dialog";
import { getExtent } from "app/lib/geometry";
import { useAtom } from "jotai";
import { selectionAtom } from "state/jotai";
import { USelection } from "state";

export default function SimplifyDialog({
  modal,
  onClose,
}: {
  modal: DialogStateSimplify;
  onClose: () => void;
}) {
  const [selection, setSelection] = useAtom(selectionAtom);
  const rep = usePersistence();
  const transact = rep.useTransact();

  const { features } = modal;

  const maxTolerance = getExtent(features)
    .map((extent) => {
      // TODO: make into a utility
      return (
        Math.max(
          Math.abs(extent[0] - extent[2]),
          Math.abs(extent[1] - extent[3])
        ) / 8
      );
    })
    .orDefault(2);

  return (
    <>
      <DialogHeader title="Simplify" titleIcon={Line} />
      <Formik
        initialValues={{
          tolerance: maxTolerance / 20,
          highQuality: true,
        }}
        onSubmit={(options) => {
          const putFeatures = features.map((wrappedFeature) => {
            return {
              ...wrappedFeature,
              feature: simplify(wrappedFeature.feature, options),
            };
          });

          if (selection.type === "single" && selection.parts.length) {
            setSelection(USelection.single(selection.id));
          }

          transact({
            note: "Simplified features",
            track: [
              "operation-simplify",
              {
                count: features.length,
              },
            ],
            putFeatures,
          })
            .catch((e) => Sentry.captureException(e))
            .finally(() => {
              onClose();
            });
        }}
      >
        <Form className="space-y-4">
          <label className="flex items-center gap-x-2">
            <FieldCheckbox name="highQuality" type="checkbox" />
            <StyledLabelSpan>High quality</StyledLabelSpan>
          </label>
          <label className="block">
            <div>
              <StyledLabelSpan>
                Tolerance (degrees, higher values simplify more)
              </StyledLabelSpan>
            </div>
            <Field
              name="tolerance"
              className="w-full"
              type="range"
              min="0"
              step={maxTolerance / 100}
              max={maxTolerance}
            />
          </label>
          <div className="flex flex-col sm:flex-row-reverse space-y-2 sm:space-y-0 sm:gap-x-3">
            <SimpleDialogActions
              variant="xs"
              action="Simplify"
              onClose={onClose}
            />
          </div>
        </Form>
      </Formik>
    </>
  );
}
