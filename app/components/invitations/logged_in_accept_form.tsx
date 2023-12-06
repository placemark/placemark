import { useMutation } from "@blitzjs/rpc";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import type { CurrentUser } from "app/users/queries/getMaybeCurrentUser";
import { Form } from "app/core/components/Form";
import acceptInvitation from "app/memberships/mutations/acceptInvitation";
import { InvitedMessage } from "./invited_message";
import { SignupWithInviteLoggedIn } from "app/auth/validations";
import { AuthorizationError } from "blitz";

export function LoggedInAcceptForm({
  currentUser,
  token,
}: {
  currentUser: NonNullable<CurrentUser>;
  token: string;
}) {
  const Router = useRouter();
  const [acceptInvitationMutation] = useMutation(acceptInvitation);

  return (
    <div className="space-y-4">
      <InvitedMessage token={token} />
      <div>
        You’re logged in as{" "}
        <span className="font-bold">
          {currentUser.name} ({currentUser.email})
        </span>
        .
      </div>
      <Form
        submitText="Accept invitation"
        schema={SignupWithInviteLoggedIn}
        initialValues={{
          invitationToken: token,
        }}
        onSubmit={async (values) => {
          try {
            await acceptInvitationMutation({
              invitationToken: values.invitationToken,
            });
            toast.success("Accepted invitation");
            await Router.push("/");
          } catch (e) {
            if (e instanceof AuthorizationError) {
              toast.error(e.message);
            } else {
              toast.error("Sorry, could not accept this invitation");
            }
          }
        }}
      ></Form>
    </div>
  );
}
