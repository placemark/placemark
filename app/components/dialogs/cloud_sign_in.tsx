import { PersonIcon } from "@radix-ui/react-icons";
import { useQueryClient } from "@tanstack/react-query";
import { DialogHeader } from "app/components/dialog";
import { HandleCombobox } from "app/components/dialogs/handle_combobox";
import SimpleDialogActions from "app/components/dialogs/simple_dialog_actions";
import { styledInlineA } from "app/components/elements";
import { CLOUD_PROVIDERS } from "app/lib/cloud_providers";
import { SIGN_IN_CANCELLED } from "app/lib/cloud_providers/types";
import { Form, Formik } from "formik";
import { captureException } from "integrations/errors";
import toast from "react-hot-toast";

interface HandleValue {
  handle: string;
}

export function CloudSignInDialog({ onClose }: { onClose: () => void }) {
  const provider = CLOUD_PROVIDERS[0];
  const queryClient = useQueryClient();

  return (
    <>
      <DialogHeader
        title={`Sign in with ${provider.label}`}
        titleIcon={PersonIcon}
      />
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        The {provider.label} is an ecosystem of apps including{" "}
        <a
          href="https://bsky.app"
          target="_blank"
          rel="noreferrer"
          className={styledInlineA}
        >
          Bluesky
        </a>
        . If you have a login for any of them, it'll work here.
      </p>
      <Formik<HandleValue>
        initialValues={{ handle: "" }}
        onSubmit={async ({ handle }) => {
          try {
            await provider.signIn(handle);
            await queryClient.invalidateQueries({
              queryKey: ["cloud-auth", provider.id],
            });
            toast.success(`Signed in with ${provider.label}`);
            onClose();
          } catch (error) {
            console.error(error);
            const message =
              error instanceof Error ? error.message : "Could not sign in";
            // A user closing the popup is an expected outcome, not an
            // error worth reporting.
            if (message !== SIGN_IN_CANCELLED) {
              captureException(error);
            }
            toast.error(message);
            // Deliberately leaves the dialog open so the user can retry.
          }
        }}
      >
        <Form>
          <HandleCombobox />
          <SimpleDialogActions onClose={onClose} action="Sign in" />
        </Form>
      </Formik>
    </>
  );
}
