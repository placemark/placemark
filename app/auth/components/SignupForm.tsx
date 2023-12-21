import { useRouter } from "next/router";
import { useMutation, useQuery } from "@blitzjs/rpc";
import { LabeledTextField } from "app/core/components/LabeledTextField";
import { Form, FORM_ERROR } from "app/core/components/Form";
import {
  styledCheckbox,
  styledInlineA,
  TextWell,
} from "app/components/elements";
import signup from "app/auth/mutations/signup";
import getSubscriptionDetails from "app/users/queries/getSubscriptionDetails";
import { Signup } from "app/auth/validations";
import { AlreadyHaveAccount } from "app/components/already_have_account";
import { Field } from "formik";
import { Routes } from "@blitzjs/next";

export const SignupForm = () => {
  const Router = useRouter();
  const [signupMutation] = useMutation(signup);
  const [subscriptionDetails] = useQuery(getSubscriptionDetails, {});

  return (
    <div>
      <div className="pb-3">
        {subscriptionDetails?.price ? (
          <TextWell>
            {subscriptionDetails.trial}-day free trial, then $
            {(subscriptionDetails.price.unit_amount ?? 0) / 100}
            /month.
          </TextWell>
        ) : null}
      </div>
      <div>
        <Form
          submitText="Sign up"
          schema={Signup}
          fullWidthSubmit
          initialValues={{
            email: "",
            name: "",
            password: "",
            organizationName: "",
            subscribe: true,
          }}
          onSubmit={async (values) => {
            try {
              await signupMutation({
                ...values,
              });
              await Router.push(Routes.PlacemarkIndex());
              return;
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
          <div className="grid md:grid-cols-2 items-start gap-x-2 gap-y-2">
            <LabeledTextField name="name" label="Your name" />
            <LabeledTextField
              required={false}
              name="organizationName"
              placeholder="My team"
              label="Organization name"
            />
          </div>
          <LabeledTextField
            name="email"
            type="email"
            label="Email"
            autoComplete="username"
          />
          <LabeledTextField
            autoComplete="new-password"
            name="password"
            label="Password"
            type="password"
          />
          <label className="flex gap-x-2 items-center text-sm">
            <Field
              type="checkbox"
              name="subscribe"
              className={styledCheckbox({ variant: "default" })}
            />
            Subscribe to monthly product updates
          </label>
        </Form>
      </div>
      <div className="text-sm pt-10">
        By signing up, you agree to our{" "}
        <a
          className={styledInlineA}
          href="https://www.placemark.io/documentation/terms-of-service"
        >
          Terms of Service
        </a>
        {" and "}
        <a
          className={styledInlineA}
          href="https://www.placemark.io/documentation/privacy"
        >
          Privacy policy
        </a>
        .
      </div>
      <AlreadyHaveAccount />
    </div>
  );
};
