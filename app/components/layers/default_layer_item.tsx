import { menuItemLike } from "app/components/elements";
import type { LayerConfigTemplate } from "app/lib/default_layers";

type T = LayerConfigTemplate;

/**
 * A list-like interface for selecting a default basemap.
 */
export function DefaultLayerItem({
  layer,
  onSelect,
}: {
  layer: T;
  onSelect: (arg0: T) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        onSelect(layer);
      }}
      className={menuItemLike({ variant: "default" })}
    >
      {layer.name || "Untitled"}
    </button>
  );
}
