import {
  DotFilledIcon,
  BoxModelIcon,
  BorderSolidIcon,
  CornersIcon,
  BorderDashedIcon,
  ValueNoneIcon,
} from "@radix-ui/react-icons";
import * as Sentry from "@sentry/nextjs";
import { useAtom, useSetAtom } from "jotai";
import { bboxToPolygon, getExtent } from "app/lib/geometry";
import {
  makeConvexHull,
  polygonToLine,
  geometryToPoints,
  splitLine,
} from "app/lib/map_operations";
import {
  isFeatureSimplifiable,
  SimplifySupportedGeometry,
} from "app/lib/map_operations/simplify";
import { usePersistence } from "app/lib/persistence/context";
import { newFeatureId } from "app/lib/id";
import toast from "react-hot-toast";
import { USelection } from "state";
import { selectionAtom } from "state/jotai";
import { dialogAtom } from "state/dialog_state";
import type {
  Polygon,
  Point,
  MultiPoint,
  Geometry,
  LineString,
  IFeature,
  IWrappedFeature,
} from "types";
import { ActionItem } from "./context_actions/action_item";
import type { Action, ActionProps } from "./context_actions/action_item";
import { ConvexIcon } from "./icons";

export function useSingleActions(
  selectedWrappedFeatures: IWrappedFeature[]
): Action[] {
  const rep = usePersistence();
  const transact = rep.useTransact();
  const [selection, setSelection] = useAtom(selectionAtom);
  const setDialogState = useSetAtom(dialogAtom);

  if (!selectedWrappedFeatures.length) {
    return [];
  }

  const toLineFeatures = selectedWrappedFeatures.filter((wrappedFeature) => {
    const type = wrappedFeature.feature.geometry?.type;
    return type === "Polygon" || type === "MultiPolygon";
  }) as IWrappedFeature<IFeature<Polygon>>[];

  const toLineAction = {
    label: "Convert to line",
    icon: <BorderSolidIcon />,
    applicable: !!toLineFeatures.length,
    onSelect: async function doPolygonToLine() {
      await transact({
        note: "Converted to a line",
        track: "feature-convert-to-line",
        putFeatures: toLineFeatures.map((wrappedFeature) => {
          return {
            ...wrappedFeature,
            feature: polygonToLine(wrappedFeature.feature),
          };
        }),
      });
    },
  };

  const simplifiableFeatures = selectedWrappedFeatures.filter(
    (wrappedFeature) => {
      return isFeatureSimplifiable(wrappedFeature);
    }
  ) as IWrappedFeature<IFeature<SimplifySupportedGeometry>>[];
  const simplifyAction = {
    label: "Simplify",
    applicable: !!simplifiableFeatures.length,
    icon: <CornersIcon />,
    //eslint-disable-next-line
    onSelect: async () => {
      setDialogState({
        type: "simplify",
        features: simplifiableFeatures,
      });
    },
  };

  const canConvexHull = !(
    selectedWrappedFeatures.length === 1 &&
    selectedWrappedFeatures[0].feature.geometry?.type === "Point"
  );
  const addConvexHullAction = {
    label: "Add convex hull",
    applicable: canConvexHull,
    icon: <ConvexIcon />,
    onSelect: async function doConvexHull() {
      await makeConvexHull(
        selectedWrappedFeatures.map((f) => f.feature)
      ).caseOf({
        Left(error) {
          toast.error(error.message);
          return Promise.resolve(undefined);
        },
        Right(hull) {
          return transact({
            note: "Added a convex hull",
            track: "operation-add-convex-hull",
            putFeatures: [
              {
                id: newFeatureId(),
                folderId: selectedWrappedFeatures[0]?.folderId || null,
                feature: hull,
              },
            ],
          }).catch((e) => Sentry.captureException(e));
        },
      });
    },
  };

  const toPointsFeatures = selectedWrappedFeatures.filter((wrappedFeature) => {
    const type = wrappedFeature.feature.geometry?.type;
    if (!type) return;
    return type !== "Point" && type !== "MultiPoint";
  }) as IWrappedFeature<IFeature<Exclude<Geometry, Point | MultiPoint>>>[];
  const toPointsAction = {
    label: "Convert to points",
    applicable: !!toPointsFeatures.length,
    icon: <DotFilledIcon />,
    onSelect: async function doGeometryToPoints() {
      const putFeatures: IWrappedFeature[] = [];
      for (const wrappedFeature of toPointsFeatures) {
        const pointFeature = geometryToPoints(wrappedFeature.feature);

        if (pointFeature) {
          putFeatures.push({
            ...wrappedFeature,
            feature: pointFeature,
          });
        }
      }

      if (putFeatures.length === 0) return;
      await transact({
        note: "Converted to points",
        track: "operation-convert-to-points",
        putFeatures,
      });
    },
  };

  const canExtent =
    selectedWrappedFeatures.length > 1 ||
    selectedWrappedFeatures[0].feature.geometry?.type !== "Point";
  const extentBoxAction = {
    applicable: canExtent,
    label: "Add extent box",
    icon: <BoxModelIcon />,
    onSelect: async function doExtentBox() {
      const extent = getExtent(selectedWrappedFeatures.map((wf) => wf.feature));
      return void (await extent.mapOrDefault((bbox) => {
        const id = newFeatureId();
        return transact({
          note: "Added an extent box",
          deleteFeatures: [],
          track: "operation-add-extent-box",
          putFeatures: [
            {
              id,
              folderId: selectedWrappedFeatures[0].folderId,
              feature: {
                type: "Feature",
                properties: {},
                geometry: bboxToPolygon(bbox),
              },
            },
          ],
        }).then(() => {
          setSelection(USelection.single(id));
        });
      }, null));
    },
  };

  const canSplitLine = !!(
    selectedWrappedFeatures.length === 1 &&
    selectedWrappedFeatures[0].feature.geometry?.type === "LineString" &&
    selection.type === "single" &&
    selection.parts.length
  );
  const splitLineAction = {
    label: "Split line at vertex",
    applicable: canSplitLine,
    icon: <BorderDashedIcon />,
    onSelect: async function doSplitLine() {
      const features = splitLine({
        feature: selectedWrappedFeatures[0].feature as IFeature<LineString>,
        sel: selection,
      });

      if (features.length === 0) return;

      await transact({
        note: "Split a line",
        deleteFeatures: [selectedWrappedFeatures[0].id],
        track: "operation-split-line",
        putFeatures: features.map((feature) => {
          return {
            id: newFeatureId(),
            folderId: selectedWrappedFeatures[0].folderId,
            feature,
          };
        }),
      });
    },
  };

  return [
    toPointsAction,
    splitLineAction,
    extentBoxAction,
    toLineAction,
    addConvexHullAction,
    simplifyAction,
  ];
}

export function SingleActions({
  as,
  selectedWrappedFeatures,
}: {
  as: ActionProps["as"];
  selectedWrappedFeatures: IWrappedFeature[];
}) {
  const actions = useSingleActions(selectedWrappedFeatures);

  const goodActions = actions.filter((action) => action.applicable);

  return goodActions.length ? (
    <>
      {goodActions.map((action, i) => (
        <ActionItem key={i} as={as} action={action} />
      ))}
    </>
  ) : as !== "context-item" ? (
    // Don't show "No actions available" when this is a
    // context item, because that means there are other multi-actions
    // also available.
    // TODO: could use a refactoring
    <ActionItem
      as={as}
      action={{
        label: "No actions available",
        icon: <ValueNoneIcon />,
        applicable: true,
        onSelect: () => {
          return Promise.resolve();
        },
      }}
    />
  ) : null;
}
