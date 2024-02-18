import { PartialLayer } from "state/jotai";
import { mapboxStaticURL } from "app/lib/mapbox_static_url";

export function Thumbnail({
  mapboxLayer,
}: {
  mapboxLayer: Pick<PartialLayer, "type" | "url" | "token">;
}) {
  const url = mapboxStaticURL(mapboxLayer);
  return (
    <div
      className="group flex flex-col
      justify-center items-center
      rounded-sm

      group-hover:ring
      group-hover:ring-2
      group-hover:ring-purple-300

      focus:ring
      focus:ring-2
      focus:ring-purple-300

      data-state-on:ring
      data-state-on:ring-2
      data-state-on:ring-purple-500
      w-32
      aspect-video"
      style={{
        backgroundImage: `url(${url})`,
        backgroundSize: "cover",
      }}
    />
  );
}
