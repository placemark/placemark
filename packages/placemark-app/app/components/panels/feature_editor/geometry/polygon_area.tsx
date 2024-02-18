import { UnitSelect } from "app/components/unit_select";
import measureArea from "@turf/area";
import { convertArea } from "@turf/helpers";
import type { Polygon, MultiPolygon, IWrappedFeature } from "types";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Input, StyledLabelSpan } from "app/components/elements";
import { useUpdateMaybeUser } from "app/hooks/update_user";

function PolygonAreaError() {
  return (
    <div className="text-sm text-gray-700 bg-gray-100 dark:text-white dark:bg-black p-2 rounded-md">
      <ExclamationTriangleIcon className="inline-block mr-1 text-purple-500 dark:text-purple-300" />
      Invalid Polygon: the area of this shape is negative, which means that one
      of its internal rings is likely larger than the outer ring.
    </div>
  );
}

export function PolygonArea({
  geometry,
}: {
  geometry: Polygon | MultiPolygon;
}) {
  const area = measureArea(geometry);
  if (area <= 0 || isNaN(area)) return <PolygonAreaError />;
  return <AreaDisplay label="Area square" area={area} />;
}

export function PolygonAreaMulti({
  features,
}: {
  features: IWrappedFeature[];
}) {
  let area = 0;
  for (const { feature } of features) {
    area += measureArea(feature);
  }

  if (area <= 0) return null;
  return <AreaDisplay label="Total area square" area={area} />;
}

function AreaDisplay({ area, label }: { area: number; label: string }) {
  const { user, setUser } = useUpdateMaybeUser();
  const { areaUnits } = user;
  return (
    <div className="text-sm">
      <StyledLabelSpan>{label}</StyledLabelSpan>
      <div className="flex items-center gap-x-2">
        <Input
          type="text"
          aria-label="Area"
          readOnly
          value={convertArea(area, "meters", areaUnits).toFixed(3)}
        />
        <UnitSelect
          value={areaUnits}
          onChange={async (unit) => {
            await setUser({
              areaUnits: unit as any,
            });
          }}
          type="area"
        />
      </div>
    </div>
  );
}
