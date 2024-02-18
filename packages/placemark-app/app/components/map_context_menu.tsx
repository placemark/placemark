import * as CM from "@radix-ui/react-context-menu";
import React, { memo } from "react";
import { useSetAtom } from "jotai";
import { USelection } from "state";
import { dialogAtom, Mode, modeAtom, selectionAtom } from "state/jotai";
import {
  ArrowRightIcon,
  CircleIcon,
  ClipboardCopyIcon,
  CommitIcon,
} from "@radix-ui/react-icons";
import type { ContextInfo } from "app/components/map_component";
import type { IFeature, IWrappedFeature, LineString } from "types";
import { GeometryActions } from "app/components/context_actions/geometry_actions";
import { CMContent, CMSubContent, CMItem, CMSubTriggerItem } from "./elements";
import {
  continueFeature,
  getContinuationDirection,
} from "app/hooks/use_line_mode";
import * as Sentry from "@sentry/nextjs";
import { usePersistence } from "app/lib/persistence/context";
import { writeToClipboard } from "app/lib/utils";
import { stringifyFeatures } from "app/hooks/use_clipboard";
import toast from "react-hot-toast";

function FeatureItem({ feature }: { feature: IWrappedFeature }) {
  const setSelection = useSetAtom(selectionAtom);
  return (
    <CMItem
      onSelect={() => {
        setSelection(USelection.single(feature.id));
      }}
      onFocus={() => {
        setSelection(USelection.single(feature.id));
      }}
      key={feature.id}
    >
      {feature.feature.geometry?.type}
    </CMItem>
  );
}

function getContinuation(contextInfo: ContextInfo) {
  for (const { id, wrappedFeature } of contextInfo.features.ids) {
    const direction = getContinuationDirection(id, wrappedFeature.feature);
    if (direction) {
      return {
        wrappedFeature: wrappedFeature as IWrappedFeature<IFeature<LineString>>,
        direction,
      };
    }
  }
  return null;
}

function MaybeContinue({ contextInfo }: { contextInfo: ContextInfo }) {
  const rep = usePersistence();
  const transact = rep.useTransact();
  const setSelection = useSetAtom(selectionAtom);
  const setMode = useSetAtom(modeAtom);
  const continuation = getContinuation(contextInfo);
  if (!continuation) return null;

  return (
    <CMItem
      onSelect={() => {
        const { wrappedFeature, direction } = continuation;
        const newFeature = continueFeature(wrappedFeature.feature, direction);
        transact({
          note: "Continued a feature",
          putFeatures: [
            {
              ...wrappedFeature,
              feature: newFeature,
            },
          ],
        })
          .then(() => {
            setSelection(USelection.single(wrappedFeature.id));
            setMode({
              mode: Mode.DRAW_LINE,
              modeOptions: { reverse: direction === "reverse" },
            });
          })
          .catch((e) => Sentry.captureException(e));
      }}
    >
      <CommitIcon />
      Continue line
    </CMItem>
  );
}

export const MapContextMenu = memo(function MapContextMenu({
  contextInfo,
}: {
  contextInfo: ContextInfo | null;
}) {
  const setDialogState = useSetAtom(dialogAtom);

  return (
    <CM.Portal>
      <CMContent>
        {contextInfo ? (
          <>
            {contextInfo.features.features.length ? (
              <CM.Sub>
                <CMSubTriggerItem>
                  Select
                  <ArrowRightIcon />
                </CMSubTriggerItem>
                <CMSubContent>
                  {contextInfo.features.features.map((feature) => {
                    return <FeatureItem key={feature.id} feature={feature} />;
                  })}
                </CMSubContent>
              </CM.Sub>
            ) : null}
            {contextInfo.selectedFeatures.length ? (
              <CM.Sub>
                <CMSubTriggerItem>
                  Operations
                  <ArrowRightIcon />
                </CMSubTriggerItem>

                <CMSubContent>
                  <GeometryActions
                    selectedWrappedFeatures={contextInfo.selectedFeatures}
                    as="context-item"
                  />
                </CMSubContent>
                <CMItem
                  onSelect={() => {
                    stringifyFeatures(contextInfo.selectedFeatures).ifJust(
                      ({ data, message }) => {
                        toast
                          .promise(writeToClipboard(data), {
                            loading: "Copying…",
                            error: "Failed to copy",
                            success: message,
                          })
                          .catch((e) => {
                            Sentry.captureException(e);
                          });
                      }
                    );
                  }}
                >
                  Copy as GeoJSON
                  <ClipboardCopyIcon />
                </CMItem>
              </CM.Sub>
            ) : null}
            <MaybeContinue contextInfo={contextInfo} />
          </>
        ) : null}
        <CMItem
          onSelect={() => {
            if (contextInfo) {
              setDialogState({
                type: "circle",
                position: contextInfo.position,
              });
            }
          }}
        >
          Draw circle here
          <CircleIcon />
        </CMItem>
      </CMContent>
    </CM.Portal>
  );
});
