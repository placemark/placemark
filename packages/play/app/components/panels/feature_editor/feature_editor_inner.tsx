import type { IWrappedFeature } from "types";
import { FeatureEditorProperties } from "./feature_editor_properties";
import { FeatureEditorId } from "./feature_editor_id";
import { FeatureEditorExport } from "./feature_editor_export";
import { FeatureEditorVertex } from "./feature_editor_vertex";
import { selectionAtom } from "state/jotai";
import React from "react";
import { RawEditor } from "./raw_editor";
import { useAtomValue } from "jotai";
import { USelection } from "state";
import { FeatureEditorNullGeometry } from "./feature_editor_null_geometry";
import { FeatureEditorCircle } from "./feature_editor_circle";
import { FeatureEditorStyle } from "./feature_editor_style";

export function FeatureEditorInner({
  selectedFeature,
}: {
  selectedFeature: IWrappedFeature;
}) {
  const selection = useAtomValue(selectionAtom);
  const vertices = USelection.getVertexIds(selection);
  const [vertexId] = vertices;
  return (
    <>
      <div className="flex-auto overflow-y-auto placemark-scrollbar">
        <FeatureEditorProperties wrappedFeature={selectedFeature} />
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-900 border-t border-gray-200 dark:border-gray-900 overflow-auto placemark-scrollbar">
        {vertexId !== undefined ? (
          <FeatureEditorVertex
            wrappedFeature={selectedFeature}
            vertexId={vertexId}
          />
        ) : null}
        <FeatureEditorNullGeometry wrappedFeature={selectedFeature} />
        <FeatureEditorCircle
          wrappedFeature={selectedFeature}
          key={`circle-${selectedFeature.id}`}
        />
        <FeatureEditorStyle
          wrappedFeature={selectedFeature}
          key={selectedFeature.id}
        />
        <FeatureEditorExport wrappedFeature={selectedFeature} />
        <FeatureEditorId wrappedFeature={selectedFeature} />
        <RawEditor feature={selectedFeature} />
      </div>
    </>
  );
}
