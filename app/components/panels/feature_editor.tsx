import { useAtomValue } from "jotai";
import { FeatureEditorInner } from "./feature_editor/feature_editor_inner";
import FeatureEditorMulti from "./feature_editor/feature_editor_multi";
import React from "react";
import { NothingSelected } from "app/components/nothing_selected";
import { selectedFeaturesAtom } from "state/jotai";

export default function FeatureEditor() {
  const selectedFeatures = useAtomValue(selectedFeaturesAtom);

  const content =
    selectedFeatures.length > 1 ? (
      <FeatureEditorMulti selectedFeatures={selectedFeatures} />
    ) : selectedFeatures.length === 1 ? (
      <FeatureEditorInner selectedFeature={selectedFeatures[0]} />
    ) : (
      <NothingSelected />
    );

  return content;
}
