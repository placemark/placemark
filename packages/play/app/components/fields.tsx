import { FILE_TYPES } from "app/lib/convert";
import { Field, ErrorMessage } from "formik";
import { InlineError } from "./inline_error";
import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import { styledSelect } from "./elements";

interface SelectFileTypeProps {
  exportable?: boolean;
  textOnly?: boolean;
}

export function SelectFileTypeField({
  name,
  exportable = false,
  textOnly = false,
}: {
  name: string;
} & SelectFileTypeProps) {
  const applicableTypes = FILE_TYPES.filter((type) => {
    if (exportable && !("back" in type)) return false;
    if (textOnly) {
      return "forwardString" in type;
    }
    return true;
  });

  return (
    <Field
      as="select"
      name={name}
      aria-label="File format"
      className={styledSelect({ size: "md" }) + "w-full"}
    >
      {applicableTypes.map((type) =>
        [type.label].flat().map((label, i) => {
          return (
            <option key={`${type.id}-${i}`} value={type.id}>
              {label}
            </option>
          );
        })
      )}
    </Field>
  );
}

export function SelectFileType({
  exportable = false,
  textOnly = false,
}: SelectFileTypeProps) {
  const name = "type";

  return (
    <>
      <label className="block pt-2 space-y-2">
        <div className="text-sm text-gray-700 dark:text-gray-300 flex items-center justify-between">
          File format
          <a
            target="_blank"
            className="focus:underline hover:underline"
            rel="noreferrer"
            href="https://www.placemark.io/documentation-index"
          >
            <QuestionMarkCircledIcon className="mr-1 inline-block" />
            Help
          </a>
        </div>
        <SelectFileTypeField
          name={name}
          exportable={exportable}
          textOnly={textOnly}
        />
      </label>
      <ErrorMessage name={name} component={InlineError} />
    </>
  );
}
