import { LinkNone2Icon } from "@radix-ui/react-icons";
import type { ActionProps } from "app/components/context_actions/action_item";
import type { BooleanOp } from "app/lib/map_operations";
import {
  ShapeIntersect16,
  ShapeUnite16,
  SendToBack16,
} from "app/components/icons";
import { mergeFeaturesMessage, mergeFeatures } from "app/lib/map_operations";
import { lib } from "app/lib/worker";
import { usePersistence } from "app/lib/persistence/context";
import { newFeatureId } from "app/lib/id";
import toast from "react-hot-toast";
import { ActionItem } from "./action_item";
import type { Action } from "./action_item";
import type { IWrappedFeature } from "types";
import * as Sentry from "@sentry/nextjs";

export function useMultiActions(
  selectedWrappedFeatures: IWrappedFeature[]
): Action[] {
  const rep = usePersistence();
  const transact = rep.useTransact();

  if (selectedWrappedFeatures.length === 0) {
    return [];
  }

  const selectedFeatures = selectedWrappedFeatures.map((f) => f.feature);

  function makeBooleanAction(
    op: BooleanOp,
    label: string,
    icon: React.ReactNode
  ) {
    return {
      label,
      icon,
      applicable: true,
      onSelect: async () => {
        const work = lib.booleanFeatures(selectedFeatures, { op }).then((res) =>
          res.caseOf({
            Left(error) {
              Sentry.captureException(error);
              return Promise.reject(error.message);
            },
            Right(features) {
              return transact({
                note: `Computed ${op} of features`,
                track: `operation-boolean-op-${op}`,
                deleteFeatures: selectedWrappedFeatures.map((f) => f.id),
                putFeatures: features.map((feature) => {
                  return {
                    id: newFeatureId(),
                    folderId: selectedWrappedFeatures[0].folderId,
                    feature: feature,
                  };
                }),
              });
            },
          })
        );
        return toast.promise(
          work,
          {
            loading: "Calculating",
            success: "Done",
            error: "Failed to compute",
          },
          {
            loading: { duration: Infinity },
            success: { duration: 2000 },
            error: { duration: 2000 },
          }
        );
      },
    };
  }

  const mergeAction = {
    applicable: true,
    label: mergeFeaturesMessage(selectedFeatures),
    icon: <LinkNone2Icon />,
    onSelect: async function doMerge() {
      const [first, ...rest] = selectedWrappedFeatures;
      const merged = mergeFeatures(selectedFeatures);
      await transact({
        deleteFeatures: rest.map((f) => f.id),
        putFeatures: [
          {
            ...first,
            feature: merged,
          },
        ],
      });
    },
  };

  return [
    mergeAction,
    makeBooleanAction("union", "Union", <ShapeUnite16 />),
    makeBooleanAction("intersection", "Intersection", <ShapeIntersect16 />),
    makeBooleanAction("difference", "Subtract", <SendToBack16 />),
  ];
}

export function MultiActions({
  as,
  selectedWrappedFeatures,
}: {
  as: ActionProps["as"];
  selectedWrappedFeatures: IWrappedFeature[];
}) {
  const actions = useMultiActions(selectedWrappedFeatures);

  return (
    <>
      {actions
        .filter((action) => action.applicable)
        .map((action, i) => (
          <ActionItem key={i} as={as} action={action} />
        ))}
    </>
  );
}
