import {
  Button,
  StyledLabelSpan,
  StyledPopoverArrow,
  StyledPopoverContent,
  styledSelect,
  TextWell,
} from "app/components/elements";
import * as P from "@radix-ui/react-popover";
import { extractPropertyKeys } from "app/lib/multi_properties";
import { FeatureMap } from "types";
import { AddFolder } from "./add_folder";
import { CaretDownIcon } from "@radix-ui/react-icons";
import { usePersistence } from "app/lib/persistence/context";

function PreviewProperty({ featureMap }: { featureMap: FeatureMap }) {
  const rep = usePersistence();
  const [meta, setMeta] = rep.useMetadata();
  const propertyKeys = extractPropertyKeys(featureMap);
  return (
    <div className="space-y-2">
      <StyledLabelSpan>Label property</StyledLabelSpan>
      <select
        className={styledSelect({ size: "sm" }) + " w-full"}
        onChange={(e) => {
          void setMeta({ label: e.target.value });
        }}
        value={meta.label || ""}
      >
        <option value={""}></option>
        {propertyKeys.map((key, i) => {
          return (
            <option value={key} key={i}>
              {key}
            </option>
          );
        })}
      </select>
      <TextWell>
        Choose a property from your data which will show up as a label for each
        feature on the map and in this list.
      </TextWell>
    </div>
  );
}

export function FeatureEditorFolderHeader({
  featureMap,
}: {
  featureMap: FeatureMap;
}) {
  const rep = usePersistence();
  const [meta] = rep.useMetadata();
  return (
    <div className="flex justify-between px-2 py-1 border-b border-gray-200 dark:border-gray-900">
      <P.Root>
        <P.Trigger aria-label="Add folder" asChild>
          <Button size="xs">
            <span className="w-30 truncate">Label: {meta.label}</span>{" "}
            <CaretDownIcon />
          </Button>
        </P.Trigger>
        <StyledPopoverContent align="end">
          <StyledPopoverArrow />
          <PreviewProperty featureMap={featureMap} />
        </StyledPopoverContent>
      </P.Root>
      <AddFolder />
    </div>
  );
}
