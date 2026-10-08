import {
  DEFAULT_IMPORT_OPTIONS,
  detectJson,
  detectType,
  type ImportOptions,
} from "app/lib/convert";
import { useFormikContext } from "formik";
import { captureException } from "integrations/errors";
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
    let cancelled = false;
    detectType(file)
      .then((detected) => {
        if (cancelled) return;
        return setValues((values) => ({
          ...values,
          ...detected.orDefault(defaultOptions),
        }));
      })
      .catch((e) => captureException(e));
    return () => {
      cancelled = true;
    };
  }, [file, setValues]);
  return null;
}

export function AutoDetectText() {
  const {
    values: { text },
    setFieldValue,
  } = useFormikContext<{ text: string }>();
  useEffect(() => {
    let cancelled = false;
    void detectJson(text).then((detected) => {
      if (!cancelled && detected.isRight()) {
        void setFieldValue("type", detected.unsafeCoerce().type);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [text, setFieldValue]);
  return null;
}
