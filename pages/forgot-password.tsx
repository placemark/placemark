import { BlitzPage } from "@blitzjs/next";
import { useMutation } from "@blitzjs/rpc";
import StandaloneFormLayout from "app/core/layouts/standalone_form_layout";
import { LabeledTextField } from "app/core/components/LabeledTextField";
import { Form, FORM_ERROR } from "app/core/components/Form";
import { ForgotPassword } from "app/auth/validations";
import forgotPassword from "app/auth/mutations/forgotPassword";
import { AlreadyHaveAccount } from "app/components/already_have_account";
import { TextWell } from "app/components/elements";
import { AuthenticationError } from "blitz";

const ForgotPasswordPage: BlitzPage = () => {
  const [forgotPasswordMutation, { isSuccess }] = useMutation(forgotPassword);

  return (
    <div>
      {isSuccess ? (
        <TextWell>
          If your email is in our system, you will receive instructions to reset
          your password shortly.
        </TextWell>
      ) : (
        <Form
          submitText="Send password reset instructions"
          schema={ForgotPassword}
          fullWidthSubmit
          initialValues={{ email: "" }}
          onSubmit={async (values) => {
            try {
              await forgotPasswordMutation(values);
            } catch (error) {
              return {
                [FORM_ERROR]:
                  error instanceof AuthenticationError
                    ? error.message
                    : "Sorry, we had an unexpected error. Please try again.",
              };
            }
          }}
        >
          <LabeledTextField name="email" label="Email" placeholder="Email" />
        </Form>
      )}
      <AlreadyHaveAccount />
    </div>
  );
};

ForgotPasswordPage.redirectAuthenticatedTo = "/";
ForgotPasswordPage.getLayout = (page) => (
  <StandaloneFormLayout title="Forgot password">{page}</StandaloneFormLayout>
);

export default ForgotPasswordPage;
