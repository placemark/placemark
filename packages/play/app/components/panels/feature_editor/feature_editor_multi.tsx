import { FeatureEditorStyleMulti } from "app/components/panels/feature_editor/feature_editor_style";
import { IWrappedFeature } from "types";
import { FeatureEditorPropertiesMulti } from "./feature_editor_properties_multi";

export default function FeatureEditorMulti({
  selectedFeatures,
}: {
  selectedFeatures: IWrappedFeature[];
}) {
  return (
    <>
      <div className="overflow-auto">
        <FeatureEditorPropertiesMulti selectedFeatures={selectedFeatures} />
      </div>
      <div className="flex-auto" />
      <div className="divide-y divide-gray-200 dark:divide-gray-900 border-t border-gray-200 dark:border-gray-900 overflow-auto placemark-scrollbar">
        <FeatureEditorStyleMulti
          wrappedFeatures={selectedFeatures}
          key="style-editor-multi"
        />
      </div>
    </>
  );
}
