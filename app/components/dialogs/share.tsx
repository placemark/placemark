import { Share1Icon } from "@radix-ui/react-icons";
import { DialogHeader } from "app/components/dialog";
import SimpleDialogActions from "app/components/dialogs/simple_dialog_actions";
import * as E from "app/components/elements";
import { useDropbox } from "app/hooks/use_dropbox";
import type { ExportOptions } from "app/lib/convert";
import { nanoid } from "app/lib/id";
import { writeToClipboard } from "app/lib/utils";
import { lib } from "app/lib/worker";
import { Form, Formik, type FormikHelpers } from "formik";
import { captureException } from "integrations/errors";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { dataAtom } from "state/jotai";

export function ShareDialog({ onClose }: { onClose: () => void }) {
  const data = useAtomValue(dataAtom);
  const dropbox = useDropbox();
  const [dropboxUrl, setDropboxUrl] = useState<string | null>(
    "https://www.dropbox.com/scl/fi/c6hi4wcr4byj9u50798zo/placemark-map-bnBEsaZsbKNW3gRdzftHx.geojson?rlkey=kql09sjikql8r9zgm1rpy5cix&st=mbbol25k&dl=1",
  );
  const checkIsAuth = () => !!localStorage.getItem("dropbox_access_token");
  const [isAuth, setIsAuth] = useState(checkIsAuth());

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAuth(checkIsAuth());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function onSubmit(
    exportOptions: ExportOptions,
    helpers: FormikHelpers<ExportOptions>,
  ) {
    try {
      // Generate the file content
      const either = await lib.fromGeoJSON(data, exportOptions);

      if (either.isLeft()) {
        either.ifLeft((error) => {
          helpers.setErrors({
            type: error.message,
          });
        });
        return;
      }

      const res = either
        .map((result) => result.result.blob)
        .orDefaultLazy(() => new Blob());

      // Handle Dropbox export
      if (!dropbox.isAuthenticated) {
        toast.error("Please connect to Dropbox first");
        return;
      }

      try {
        helpers.setSubmitting(true);
        const filename = `placemark-map-${nanoid()}.geojson`;
        const result = await dropbox.uploadFile(res, filename);
        if (result) {
          setDropboxUrl(result.url);
          toast.success(`Uploaded to Dropbox: ${result.path}`);
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to upload to Dropbox");
        captureException(error);
      } finally {
        helpers.setSubmitting(false);
      }

      toast.success("Saved");
      onClose();
    } catch (_e) {}
  }

  if (dropboxUrl) {
    const openWithEditU = new URL(window.location.href);
    openWithEditU.pathname = "";
    openWithEditU.searchParams.append("load", dropboxUrl);
    const openWithEdit = openWithEditU.toString();
    return (
      <>
        <DialogHeader title="Share" titleIcon={Share1Icon} />
        {dropboxUrl && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={dropboxUrl}
                className="flex-1 rounded border px-2 py-1 text-sm"
                onClick={(e) => e.currentTarget.select()}
              />
              <E.Button
                type="button"
                size="xs"
                onClick={() => {
                  void toast.promise(writeToClipboard(dropboxUrl), {
                    loading: "Copying…",
                    success: "Copied",
                    error: "Failed to copy. Try again?",
                  });
                }}
              >
                Copy download link
              </E.Button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={openWithEdit}
                className="flex-1 rounded border px-2 py-1 text-sm"
                onClick={(e) => e.currentTarget.select()}
              />
              <E.Button
                type="button"
                size="xs"
                onClick={() => {
                  void toast.promise(writeToClipboard(openWithEdit), {
                    loading: "Copying…",
                    success: "Copied",
                    error: "Failed to copy. Try again?",
                  });
                }}
              >
                Open Placemark with this dataset ready to edit
              </E.Button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <DialogHeader title="Share" titleIcon={Share1Icon} />
      <Formik
        onSubmit={onSubmit}
        initialValues={{
          type: "geojson",
          folderId: "",
        }}
      >
        {({ values, isSubmitting }) => {
          return (
            <Form>
              <div>
                <div className="space-y-4">
                  {/* Dropbox authentication */}
                  <div className="space-y-2">
                    {dropbox.error && (
                      <E.TextWell variant="destructive">
                        {dropbox.error}
                      </E.TextWell>
                    )}
                    {!isAuth ? (
                      <div className="space-y-2">
                        <E.TextWell>
                          Connect to Dropbox to upload your map file and get a
                          shareable link.
                        </E.TextWell>
                        <E.Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            const width = 500;
                            const height = 600;
                            const left =
                              window.screenX + (window.outerWidth - width) / 2;
                            const top =
                              window.screenY +
                              (window.outerHeight - height) / 2;
                            window.open(
                              "/connect-dropbox",
                              "_blank",
                              `width=${width},height=${height},left=${left},top=${top},resizable,scrollbars`,
                            );
                          }}
                        >
                          Connect to Dropbox
                        </E.Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <E.TextWell variant="default">
                          ✓ Connected to Dropbox
                        </E.TextWell>
                        <E.Button
                          type="button"
                          size="xs"
                          variant="default"
                          onClick={dropbox.disconnect}
                        >
                          Disconnect
                        </E.Button>
                      </div>
                    )}
                  </div>
                </div>
                <SimpleDialogActions
                  onClose={onClose}
                  action="Share with Dropbox"
                  disabled={isSubmitting || !isAuth}
                />
              </div>
            </Form>
          );
        }}
      </Formik>
    </>
  );
}
