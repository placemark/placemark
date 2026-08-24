import { mapboxStaticURL, type PreviewLayer } from "app/lib/mapbox_static_url";

export function Thumbnail({ mapboxLayer }: { mapboxLayer: PreviewLayer }) {
  const url = mapboxStaticURL(mapboxLayer);
  return (
    <div
      className="group flex flex-col
      justify-center items-center
      rounded-xs

      group-hover:ring-3
      group-hover:ring-2
      group-hover:ring-purple-300

      focus:ring-3
      focus:ring-2
      focus:ring-purple-300

      data-state-on:ring-3
      data-state-on:ring-2
      data-state-on:ring-purple-500
      w-32
      aspect-video"
      style={{
        backgroundImage: url ? `url(${url})` : undefined,
        backgroundColor: url ? undefined : "#e5e7eb",
        backgroundSize: "cover",
      }}
    />
  );
}
