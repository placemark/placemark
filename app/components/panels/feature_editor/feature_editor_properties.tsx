import React, { useRef, memo, useMemo } from "react";
import { PropertyRow, PropertyRowReadonly } from "./property_row";
import { NewRow } from "./new_row";
import { castExplicit, ExplicitCast } from "app/lib/cast";
import { usePersistence } from "app/lib/persistence/context";
import type { Feature, IWrappedFeature } from "types";
import without from "lodash/without";
import sortBy from "lodash/sortBy";
import type { JsonValue } from "type-fest";
import * as Sentry from "@sentry/nextjs";
import { updatePropertyValue } from "app/lib/map_operations/update_property_value";
import { updatePropertyKey } from "app/lib/map_operations/update_property_key";
import { deletePropertyKey } from "app/lib/map_operations/delete_property_key";
import type { IPersistence } from "app/lib/persistence/ipersistence";
import {
  styledCheckbox,
  StyledTooltipArrow,
  TContent,
} from "app/components/elements";
import { PanelDetails } from "app/components/panel_details";
import { extractPropertyKeys } from "app/lib/multi_properties";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useAtom, useAtomValue } from "jotai";
import { dataAtom, showAllAtom } from "state/jotai";
import { onArrow } from "app/lib/arrow_navigation";

const ShowAllToggle = memo(function ShowAllToggle() {
  const [showAll, setShowAll] = useAtom(showAllAtom);
  return (
    <Tooltip.Root delayDuration={300}>
      <Tooltip.Trigger asChild>
        <label className="inline-flex gap-x-2">
          Show all
          <input
            type="checkbox"
            className={styledCheckbox({ variant: "default" })}
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
          />
        </label>
      </Tooltip.Trigger>
      <TContent size="md">
        <StyledTooltipArrow />
        Show all possible properties from all features, even if they aren’t
        defined on this feature.
      </TContent>
    </Tooltip.Root>
  );
});

export const FeatureEditorProperties = memo(function FeatureEditorProperties({
  wrappedFeature,
}: {
  wrappedFeature: IWrappedFeature;
}) {
  const rep = usePersistence();
  const showAll = useAtomValue(showAllAtom);

  return (
    <PanelDetails
      title="Properties"
      variant="fullwidth"
      accessory={<ShowAllToggle />}
    >
      <div className="pb-3 contain-layout">
        <FeatureEditorPropertiesRaw
          wrappedFeature={wrappedFeature}
          showAll={showAll}
          rep={rep}
          key={`properties-${String(showAll)}`}
        />
      </div>
    </PanelDetails>
  );
});

export function PropertyTableHead() {
  return (
    <thead>
      <tr className="bg-gray-100 dark:bg-gray-800 font-sans text-gray-500 dark:text-gray-100 text-xs text-left">
        <th className="pl-3 py-2 border-r border-t border-b border-gray-200 dark:border-gray-700">
          Name
        </th>
        <th className="pl-2 py-2 border-l border-t border-b border-gray-200 dark:border-gray-700">
          Value
        </th>
      </tr>
    </thead>
  );
}

function FeatureEditorPropertiesRaw({
  wrappedFeature,
  rep,
  showAll,
}: {
  wrappedFeature: IWrappedFeature;
  rep: IPersistence;
  showAll: boolean;
}) {
  const { featureMap } = useAtomValue(dataAtom);
  const { feature } = wrappedFeature;
  const {
    feature: { properties },
  } = wrappedFeature;

  const propertyKeys = extractPropertyKeys(featureMap);

  const missingProperties = useMemo(() => {
    const missing: { [key: string]: undefined } = {};
    if (!properties) {
      return propertyKeys;
    }
    for (const propName of propertyKeys) {
      if (!(propName in properties)) {
        missing[propName] = undefined;
      }
    }
    return missing;
  }, [properties, propertyKeys]);

  const transact = rep.useTransact();

  const localOrder = useRef<string[]>(
    Object.keys({
      ...(properties || {}),
      ...(showAll ? missingProperties || {} : []),
    })
  );

  function updateFeature(feature: Feature) {
    return transact({
      putFeatures: [
        {
          ...wrappedFeature,
          feature,
        },
      ],
    });
  }

  const updateValue = (key: string, value: JsonValue) => {
    updateFeature(updatePropertyValue(feature, { key, value })).catch((e) =>
      Sentry.captureException(e)
    );
  };

  const updateKey = (key: string, newKey: string) => {
    updateFeature(updatePropertyKey(feature, { key, newKey })).catch((e) =>
      Sentry.captureException(e)
    );
  };

  const deleteKey = (key: string) => {
    localOrder.current = without(localOrder.current, key);
    updateFeature(deletePropertyKey(feature, { key })).catch((e) =>
      Sentry.captureException(e)
    );
  };

  const castValue = (key: string, value: string, castType: ExplicitCast) => {
    const properties = { ...feature.properties };
    properties[key] = castExplicit(value, castType);
    updateFeature({
      ...feature,
      properties,
    }).catch((e) => Sentry.captureException(e));
  };

  const addRow = (key: string, value: string) => {
    const newFeature = updatePropertyValue(feature, { key, value });
    if (!localOrder.current.includes(key)) localOrder.current.push(key);
    updateFeature(newFeature)
      .then(() => {})
      .catch((e) => Sentry.captureException(e));
  };

  const pairs = sortBy(
    Object.entries({
      ...(properties || {}),
      ...(showAll ? missingProperties : []),
    }),
    ([key]) => {
      return localOrder.current.indexOf(key);
    }
  );

  return (
    <div
      className="overflow-y-auto placemark-scrollbar"
      data-focus-scope
      onKeyDown={onArrow}
    >
      <table className="pb-2 w-full">
        <PropertyTableHead />
        <tbody>
          {pairs.map((pair, y) => {
            return (
              <PropertyRow
                key={pair[0]}
                pair={pair}
                y={y}
                even={y % 2 === 0}
                onChangeValue={updateValue}
                onChangeKey={updateKey}
                onDeleteKey={deleteKey}
                onCast={castValue}
              />
            );
          })}
          <NewRow y={pairs.length} onCommit={addRow} />
        </tbody>
      </table>
    </div>
  );
}

export function FeatureEditorPropertiesReadonly({
  wrappedFeature,
}: {
  wrappedFeature: IWrappedFeature;
}) {
  const {
    feature: { properties },
  } = wrappedFeature;

  const localOrder = useRef<string[]>(
    Object.keys({
      ...(properties || {}),
    })
  );

  const pairs = sortBy(
    Object.entries({
      ...(properties || {}),
    }),
    ([key]) => {
      return localOrder.current.indexOf(key);
    }
  );

  return (
    <div
      className="overflow-y-auto placemark-scrollbar"
      data-focus-scope
      onKeyDown={onArrow}
    >
      <table className="pb-2 w-full">
        <PropertyTableHead />
        <tbody>
          {pairs.map((pair, y) => {
            return (
              <PropertyRowReadonly
                key={pair[0]}
                pair={pair}
                y={y}
                even={y % 2 === 0}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
