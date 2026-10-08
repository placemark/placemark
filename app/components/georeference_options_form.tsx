import type { ImportOptions } from "app/lib/convert";
import { useFormikContext } from "formik";
import { FieldCheckbox, TextWell } from "./elements";

export function GeoreferenceOptionsForm() {
  const { values } = useFormikContext<ImportOptions>();
  if (values.type !== "georeference") return null;
  return (
    <fieldset className="space-y-2 text-sm">
      <legend className="pb-2">Import as</legend>
      {(
        [
          ["points", "Control points"],
          ["layer", "Allmaps layer"],
          ["mask", "Mask polygons"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="flex items-center gap-x-2">
          <FieldCheckbox type="checkbox" name={`georeferenceOptions.${key}`} />
          <span>{label}</span>
        </label>
      ))}
      <TextWell>
        Choose one or more. Imported points and polygons are independent of the
        map layer.
      </TextWell>
    </fieldset>
  );
}
