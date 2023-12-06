import Link from "next/link";
import { useMutation } from "@blitzjs/rpc";
import { useRouter } from "next/router";
import { BlitzPage } from "@blitzjs/next";
import StandaloneFormLayout from "app/core/layouts/standalone_form_layout";
import { LabeledTextField } from "app/core/components/LabeledTextField";
import { Form, FORM_ERROR } from "app/core/components/Form";
import { ResetPassword } from "app/auth/validations";
import resetPassword from "app/auth/mutations/resetPassword";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import React from "react";
import { Loading, styledInlineA } from "app/components/elements";

const ResetPasswordPage: BlitzPage = () => {
  const query = useRouter().query;
  const [resetPasswordMutation, { isSuccess }] = useMutation(resetPassword);

  if (!query.token) {
    return <Loading />;
  }

  return (
    <div>
      <h1 className="text-lg font-bold pb-4">Set a new password</h1>

      {isSuccess ? (
        <div>
          <div className="flex items-center">
            <CheckCircledIcon className="mr-2" /> Password Reset Successfully
          </div>
          <p>
            <Link href="/" className={styledInlineA}>
              Back to home
            </Link>
          </p>
        </div>
      ) : (
        <Form
          submitText="Reset Password"
          schema={ResetPassword}
          initialValues={{
            password: "",
            passwordConfirmation: "",
            token: query.token as string,
          }}
          onSubmit={async (values) => {
            try {
              await resetPasswordMutation({
                ...values,
                token: query.token as string,
              });
            } catch (error: any) {
              if (error.name === "ResetPasswordError") {
                return {
                  [FORM_ERROR]: error.message,
                };
              } else {
                return {
                  [FORM_ERROR]:
                    "Sorry, we had an unexpected error. Please try again.",
                };
              }
            }
          }}
        >
          <LabeledTextField
            name="password"
            label="New Password"
            type="password"
          />
          <LabeledTextField
            name="passwordConfirmation"
            label="Confirm New Password"
            type="password"
          />
        </Form>
      )}
    </div>
  );
};

ResetPasswordPage.redirectAuthenticatedTo = "/";
ResetPasswordPage.getLayout = (page) => (
  <StandaloneFormLayout title="Reset your password">
    {page}
  </StandaloneFormLayout>
);

export default ResetPasswordPage;
