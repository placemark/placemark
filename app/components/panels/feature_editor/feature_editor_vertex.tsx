import { setCoordinates } from "app/lib/map_operations";
import useResettable from "app/hooks/use_resettable";
import { usePersistence } from "app/lib/persistence/context";
import * as Sentry from "@sentry/nextjs";
import { LongitudeLatitudeInputs } from "app/components/longitude_latitude_inputs";
import { PanelDetails } from "app/components/panel_details";
import type { IWrappedFeature } from "types";
import { getCoordinatesMaybe } from "app/lib/map_operations/get_coordinates";

export function FeatureEditorVertex({
  wrappedFeature,
  vertexId,
}: {
  wrappedFeature: IWrappedFeature;
  vertexId: VertexId;
}) {
  const rep = usePersistence();
  const transact = rep.useTransact();

  const coordinatesMaybe = getCoordinatesMaybe(
    wrappedFeature.feature,
    vertexId
  );

  const [longitude, latitude] = coordinatesMaybe.orDefault([0, 0]);

  const longitudeProps = useResettable({
    value: longitude.toString(),
    onCommit(newValue) {
      const num = +newValue;
      if (!isNaN(num)) {
        transact({
          putFeatures: [
            {
              ...wrappedFeature,
              feature: setCoordinates({
                breakRectangle: true,
                feature: wrappedFeature.feature,
                position: [num, latitude],
                vertexId: vertexId,
              }).feature,
            },
          ],
        }).catch((e) => Sentry.captureException(e));
      }
    },
  });
  const latitudeProps = useResettable({
    value: latitude.toString(),
    onCommit(newValue) {
      const num = +newValue;
      if (!isNaN(num)) {
        transact({
          putFeatures: [
            {
              ...wrappedFeature,
              feature: setCoordinates({
                breakRectangle: true,
                feature: wrappedFeature.feature,
                position: [longitude, num],
                vertexId: vertexId,
              }).feature,
            },
          ],
        }).catch((e) => Sentry.captureException(e));
      }
    },
  });

  if (coordinatesMaybe.isNothing()) {
    return null;
  }

  return (
    <PanelDetails title="Selected vertex">
      <LongitudeLatitudeInputs
        longitudeProps={longitudeProps}
        latitudeProps={latitudeProps}
      />
    </PanelDetails>
  );
}
