import { useMutation } from "@blitzjs/rpc";
import { useRouter } from "next/router";
import { LabeledTextField } from "app/core/components/LabeledTextField";
import { Form, FORM_ERROR } from "app/core/components/Form";
import signupWithInvite from "app/auth/mutations/signupWithInvite";
import { SignupWithInvite } from "app/auth/validations";
import { InvitedMessage } from "./invited_message";
import { AlreadyHaveAccount } from "app/components/already_have_account";

export function LoggedOutAcceptForm({ token }: { token: string }) {
  const [signupWithInviteMutation] = useMutation(signupWithInvite);
  const Router = useRouter();

  return (
    <div className="space-y-4">
      <InvitedMessage token={token} />
      <div>
        <Form
          submitText="Sign up & accept invitation"
          schema={SignupWithInvite}
          initialValues={{
            email: "",
            password: "",
            invitationToken: token,
          }}
          onSubmit={async (values) => {
            try {
              await signupWithInviteMutation(values);
              await Router.push("/");
            } catch (error: any) {
              if (
                error.code === "P2002" &&
                // eslint-disable-next-line
                error.meta?.target?.includes("email")
              ) {
                // This error comes from Prisma
                return { email: "This email is already being used" };
              } else {
                return { [FORM_ERROR]: (error as Error).toString() };
              }
            }
          }}
        >
          <LabeledTextField name="email" label="Email" />
          <LabeledTextField name="password" label="Password" type="password" />
        </Form>

        <AlreadyHaveAccount />
      </div>
    </div>
  );
}
