import { ChangeEvent, useEffect } from "react";
import type { IWrappedFeature } from "types";
import { panelCircleOpen } from "state/jotai";
import { PanelDetailsCollapsible } from "app/components/panel_details";
import { Button, inputClass, styledSelect } from "app/components/elements";
import {
  getCircleProp,
  getCircleRadius,
  makeCircleNative,
} from "app/lib/circle";
import { Field, Form, Formik, useFormikContext } from "formik";
import { usePersistence } from "app/lib/persistence/context";
import { CIRCLE_TYPE } from "state/mode";
import { convertLength, Units } from "@turf/helpers";
import { UnitOptionsGroups } from "app/components/unit_select";
import { GROUPED_UNIT_OPTIONS } from "app/lib/constants";

export function FeatureEditorCircle({
  wrappedFeature,
}: {
  wrappedFeature: IWrappedFeature;
}) {
  const rep = usePersistence();
  const transact = rep.useTransact();
  const prop = getCircleProp(wrappedFeature.feature);
  const radius = getCircleRadius(wrappedFeature.feature);
  if (!prop || !radius) return null;

  const radiusField = (
    <Field
      type="number"
      name="radius"
      min="0"
      step="any"
      className={inputClass({ _size: "sm" })}
    />
  );
  return (
    <PanelDetailsCollapsible
      title={`${prop.type} circle`}
      atom={panelCircleOpen}
    >
      <Formik
        initialValues={{
          radius:
            prop.type === CIRCLE_TYPE.GEODESIC
              ? convertLength(radius, "radians", "meters")
              : radius,
          units: "meters" as Units,
        }}
        onSubmit={async (values) => {
          const radius =
            prop.type === CIRCLE_TYPE.GEODESIC
              ? convertLength(values.radius, values.units, "radians")
              : values.radius;

          return transact({
            track: "resize-circle",
            putFeatures: [
              {
                ...wrappedFeature,
                feature: {
                  ...wrappedFeature.feature,
                  geometry: makeCircleNative({
                    center: prop.center,
                    type: prop.type,
                    value: radius,
                  }),
                },
              },
            ],
          });
        }}
      >
        <Form className="space-y-2">
          {prop.type === CIRCLE_TYPE.MERCATOR ? (
            <label className="text-xs" htmlFor="radius">
              Radius in mercator meters
            </label>
          ) : prop.type === CIRCLE_TYPE.DEGREES ? (
            <label className="text-xs" htmlFor="radius">
              Radius in decimal degrees
            </label>
          ) : null}
          {prop.type === CIRCLE_TYPE.GEODESIC ? (
            <div className="flex gap-x-2">
              {radiusField}
              <UnitSelectField />
              <Button type="submit">Resize</Button>
            </div>
          ) : (
            <div className="flex gap-x-2">
              {radiusField}
              <Button type="submit">Resize</Button>
            </div>
          )}
          <AutoReset type={prop.type} wrappedFeature={wrappedFeature} />
        </Form>
      </Formik>
    </PanelDetailsCollapsible>
  );
}

function AutoReset({
  type,
  wrappedFeature,
}: {
  type: CIRCLE_TYPE;
  wrappedFeature: IWrappedFeature;
}) {
  const { setFieldValue } = useFormikContext();

  useEffect(() => {
    const radius = getCircleRadius(wrappedFeature.feature);

    if (radius) {
      setFieldValue(
        "radius",
        type === CIRCLE_TYPE.GEODESIC
          ? convertLength(radius, "radians", "meters")
          : radius
      );
    }
  }, [setFieldValue, type, wrappedFeature]);

  return null;
}

export function UnitSelectField() {
  const { values, setFieldValue } = useFormikContext<{
    radius: number;
    units: Units;
  }>();
  return (
    <Field
      as="select"
      className={styledSelect({ size: "sm" }) + " w-24"}
      name="units"
      aria-label="Select units"
      onChange={(e: ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value as Units;
        setFieldValue(
          "radius",
          convertLength(values.radius, values.units, newValue)
        );
        setFieldValue("units", newValue);
      }}
    >
      <UnitOptionsGroups groups={GROUPED_UNIT_OPTIONS.length} />
    </Field>
  );
}
