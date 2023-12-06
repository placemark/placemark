import { LockClosedIcon } from "@radix-ui/react-icons";
import { DialogHeader } from "app/components/dialog";
import { TextWell } from "../elements";
import SigninForm from "app/auth/components/SigninForm";
import { DialogStateReauth } from "state/dialog_state";

export function ReauthDialog({
  resolve,
  onClose,
}: {
  resolve: DialogStateReauth["resolve"];
  onClose: () => void;
}) {
  return (
    <>
      <DialogHeader title="Log in" titleIcon={LockClosedIcon} />
      <TextWell size="md">
        It appears that you’ve been logged out of your account. Please
        reauthenticate.
      </TextWell>
      <SigninForm
        onSuccess={() => {
          resolve(null);
          onClose();
        }}
      />
    </>
  );
}
