import { Formik, Form } from "formik";
import { GlobeIcon } from "@radix-ui/react-icons";
import { DialogHeader } from "app/components/dialog";
import SimpleDialogActions from "app/components/dialogs/simple_dialog_actions";
import LabeledTextField from "app/core/components/LabeledTextField";
import { useState } from "react";
import { InlineError } from "app/components/inline_error";
import { useSetAtom } from "jotai";
import { dialogAtom } from "state/dialog_state";
import { styledInlineA, TextWell } from "app/components/elements";
import { MB_TO_BYTES } from "app/lib/constants";

interface UrlValue {
  url: string;
}

const MB_LIMIT = 5;

export function ImportURLDialog({ onClose }: { onClose: () => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const setDialogState = useSetAtom(dialogAtom);

  return (
    <>
      <DialogHeader title="Import from URL" titleIcon={GlobeIcon} />
      <Formik<UrlValue>
        onSubmit={async function onSubmit({ url }) {
          try {
            const res = await fetch(url);
            const buffer = await res.arrayBuffer();
            if (buffer.byteLength > MB_TO_BYTES * MB_LIMIT) {
              setFormError(
                `Files over ${MB_LIMIT}MB are not supported for URL input.`
              );
              return;
            }
            setDialogState({
              type: "import",
              files: [
                {
                  type: "file",
                  file: new File([buffer], url.split("/").pop() || "", {
                    type: res.headers.get("Content-Type") || "",
                  }),
                },
              ],
            });
          } catch (e) {
            setFormError(`Could not load data from that URL.`);
          }
        }}
        initialValues={{
          url: "",
        }}
      >
        <Form>
          <LabeledTextField type="url" label="URL" name="url" />
          <div className="space-y-2">
            {formError && <InlineError>{formError}</InlineError>}
            <TextWell>
              Load data from a URL. URLs must be public and need to support{" "}
              <a
                className={styledInlineA}
                href="https://enable-cors.org/"
                target="_blank"
                rel="noreferrer"
              >
                CORS
              </a>
              .
            </TextWell>
          </div>
          <SimpleDialogActions onClose={onClose} action="Load" />
        </Form>
      </Formik>
    </>
  );
}
