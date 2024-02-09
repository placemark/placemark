import { useRouter } from "next/router";
import { useMutation } from "@blitzjs/rpc";
import { LabeledTextField } from "app/core/components/LabeledTextField";
import { Form, FORM_ERROR } from "app/core/components/Form";
import { styledInlineA } from "app/components/elements";
import signup from "app/auth/mutations/signup";
import { Signup } from "app/auth/validations";
import { AlreadyHaveAccount } from "app/components/already_have_account";
import { Routes } from "@blitzjs/next";

export const SignupForm = () => {
  const Router = useRouter();
  const [signupMutation] = useMutation(signup);

  return (
    <div>
      <div className="pb-3">Free</div>
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
