import { useFormikContext } from "formik";
import * as Sentry from "@sentry/nextjs";
import {
  ImportOptions,
  detectType,
  DEFAULT_IMPORT_OPTIONS,
} from "app/lib/convert";
import { useEffect } from "react";

const defaultOptions = {
  type: "geojson",
  toast: true,
  secondary: false,
  ...DEFAULT_IMPORT_OPTIONS,
} as const;

export function AutoDetect({ file }: { file: File }) {
  const { setValues } = useFormikContext<ImportOptions>();

  useEffect(() => {
    detectType(file)
      .then((detected) => {
        return setValues((values) => ({
          ...values,
          ...detected.orDefault(defaultOptions),
        }));
      })
      .catch((e) => Sentry.captureException(e));
  }, [file, setValues]);
  return null;
}
