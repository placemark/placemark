import { Button, sharedOutline, TextWell } from "app/components/elements";
import { PanelDetailsCollapsible } from "app/components/panel_details";
import { FeatureText } from "app/components/panels/feature_editor/raw_editor_text";
import clsx from "clsx";
import { useSetAtom } from "jotai";
import React from "react";
import { dialogAtom, panelRawOpen } from "state/jotai";
import type { IWrappedFeature } from "types";

export function RawEditor({ feature }: { feature: IWrappedFeature }) {
  const setDialogState = useSetAtom(dialogAtom);
  return (
    <PanelDetailsCollapsible title="GeoJSON" atom={panelRawOpen}>
      <>
        <div className={`${clsx(sharedOutline("default"))} rounded-sm`}>
          <FeatureText feature={feature} />
        </div>
        <div className="pt-2">
          <TextWell size="xs">
            This editor edits this feature. You can copy & paste new GeoJSON
            features or feature collections under Menu →{" "}
            <Button
              onClick={() => {
                setDialogState({
                  type: "load_text",
                });
              }}
              size="xs"
            >
              Paste text
            </Button>
            .
          </TextWell>
        </div>
      </>
    </PanelDetailsCollapsible>
  );
}
