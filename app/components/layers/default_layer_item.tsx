import {
  contentLike,
  menuItemLike,
  StyledTooltipArrow,
} from "app/components/elements";
import * as Tooltip from "@radix-ui/react-tooltip";
import clsx from "clsx";
import { Thumbnail } from "./thumbnail";
import { LayerConfigTemplate } from "app/lib/default_layers";

type T = LayerConfigTemplate;

/**
 * Only applicable to Mapbox layers, this is
 * a "list-like" interface.
 */
export function DefaultLayerItem({
  mapboxLayer,
  onSelect,
}: {
  mapboxLayer: T;
  onSelect: (arg0: T) => void;
}) {
  return (
    <Tooltip.Root delayDuration={0}>
      <Tooltip.Trigger asChild>
        <button
          onClick={() => {
            onSelect(mapboxLayer);
          }}
          className={menuItemLike({ variant: "default" })}
        >
          {mapboxLayer.name || "Untitled"}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content className={clsx(contentLike, "py-1 px-1")} side="left">
        <Thumbnail mapboxLayer={mapboxLayer} />
        <StyledTooltipArrow />
      </Tooltip.Content>
    </Tooltip.Root>
  );
}
