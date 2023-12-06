import { memo } from "react";
import { updatePropertyValue } from "app/lib/map_operations/update_property_value";
import * as Sentry from "@sentry/nextjs";
import type { CoordProps, IWrappedFeature } from "types";
import { usePersistence } from "app/lib/persistence/context";
import { useZoomTo } from "app/hooks/use_zoom_to";
import { PropertyRowValue } from "../feature_editor/property_row/value";
import { JsonValue } from "type-fest";

export const PropertyColumn = memo(function PropertyColumn({
  feature,
  column,
  x,
  y,
}: {
  feature: IWrappedFeature;
  column: string;
} & CoordProps) {
  const zoomTo = useZoomTo();
  const rep = usePersistence();
  const transact = rep.useTransact();
  let value = feature.feature.properties?.[column];
  if (value === undefined || value === null) value = "";

  function onChangeValue(value: JsonValue) {
    transact({
      note: "Changed a property value",
      putFeatures: [
        {
          ...feature,
          feature: updatePropertyValue(feature.feature, {
            key: column,
            value: value,
          }),
        },
      ],
    }).catch((e) => Sentry.captureException(e));
  }

  return (
    <div className="group">
      <PropertyRowValue
        x={x}
        y={y}
        pair={[column, value]}
        table
        onChangeValue={(_key, value) => onChangeValue(value)}
        onFocus={() => zoomTo([feature])}
        onDeleteKey={() => {}}
        onCast={() => {}}
        even={false}
      />
    </div>
  );
});
