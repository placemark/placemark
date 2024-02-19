import { CircleIcon } from "@radix-ui/react-icons";
import { DialogHeader } from "app/components/dialog";
import { usePersistence } from "app/lib/persistence/context";
import {
  Hint,
  StyledField,
  styledInlineA,
  StyledLabelSpan,
  styledSelect,
} from "../elements";
import * as Sentry from "@sentry/nextjs";
import { dialogAtom, DialogStateCircle } from "state/dialog_state";
import SimpleDialogActions from "app/components/dialogs/simple_dialog_actions";
import { UnitOptionsGroups } from "app/components/unit_select";
import { GROUPED_UNIT_OPTIONS } from "app/lib/constants";
import { Formik, Form, Field } from "formik";
import { CIRCLE_TYPE } from "state/mode";
import { ICircleProp, makeCircleNative } from "app/lib/circle";
import { newFeatureId } from "app/lib/id";
import { useZoomTo } from "app/hooks/use_zoom_to";
import { USelection } from "state";
import { convertLength, Units } from "@turf/helpers";
import { useSetAtom } from "jotai";

export function CircleDialog({
  modal,
  onClose,
}: {
  modal: DialogStateCircle;
  onClose: () => void;
}) {
  const rep = usePersistence();
  const transact = rep.useTransact();
  const { position } = modal;
  const zoomTo = useZoomTo();
  const setDialogState = useSetAtom(dialogAtom);

  return (
    <>
      <DialogHeader title="Circle" titleIcon={CircleIcon} />
      <Formik
        initialValues={{
          units: "meters" as Units,
          type: CIRCLE_TYPE.GEODESIC,
          radius: 1,
        }}
        onSubmit={async (values) => {
          const properties: ICircleProp = {
            "@circle": {
              type: values.type,
              center: position,
            },
          };
          const id = newFeatureId();

          const geometry = makeCircleNative({
            center: position,
            value:
              values.type === CIRCLE_TYPE.GEODESIC
                ? convertLength(values.radius, values.units, "radians")
                : values.radius,
            type: values.type,
          });

          await transact({
            note: "Drew a feature",
            putFeatures: [
              {
                id,
                folderId: null,
                feature: {
                  type: "Feature",
                  // @ts-expect-error fixme, invalid type error
                  properties,
                  geometry,
                },
              },
            ],
            track: "create-circle-dialog",
          })
            .catch((e) => Sentry.captureException(e))
            .then(() => {
              return zoomTo(USelection.single(id));
            })
            .finally(() => {
              onClose();
            });
        }}
      >
        {({ values }) => {
          return (
            <Form className="space-y-4">
              <div className="grid grid-cols-3 gap-x-2">
                <label className="block">
                  <div>
                    <StyledLabelSpan>
                      Type
                      <span className="w-2 inline-flex"></span>
                      <Hint>
                        Geodesic circles have a real-world radius. Mercator
                        circles look like circles on the map. Degrees circles
                        have a radius in decimal degrees.
                        <span
                          onClick={() => {
                            setDialogState({ type: "circle_types" });
                          }}
                          className={styledInlineA}
                        >
                          More documentation.
                        </span>
                      </Hint>
                    </StyledLabelSpan>
                  </div>
                  <Field
                    as="select"
                    name="type"
                    className={styledSelect({ size: "sm" }) + " w-full"}
                  >
                    {Object.values(CIRCLE_TYPE).map((type) => {
                      return (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      );
                    })}
                  </Field>
                </label>
                <label className="block">
                  <div>
                    <StyledLabelSpan>Radius</StyledLabelSpan>
                  </div>
                  <StyledField name="radius" className="w-full" type="number" />
                </label>

                {values.type === CIRCLE_TYPE.DEGREES ? (
                  <div className="pt-7 text-sm">Decimal degrees</div>
                ) : values.type === CIRCLE_TYPE.MERCATOR ? (
                  <div className="pt-7 text-sm">Mercator meters</div>
                ) : (
                  <label className="block">
                    <div>
                      <StyledLabelSpan>Units</StyledLabelSpan>
                    </div>
                    <Field
                      as="select"
                      name="units"
                      className={styledSelect({ size: "sm" }) + " w-full"}
                    >
                      <UnitOptionsGroups groups={GROUPED_UNIT_OPTIONS.length} />
                    </Field>
                  </label>
                )}
              </div>
              <div className="flex flex-col sm:flex-row-reverse space-y-2 sm:space-y-0 sm:gap-x-3">
                <SimpleDialogActions
                  variant="xs"
                  action="Draw circle"
                  onClose={onClose}
                />
              </div>
            </Form>
          );
        }}
      </Formik>
    </>
  );
}
