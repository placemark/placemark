import { BlitzPage } from "@blitzjs/next";
import StandaloneFormLayout from "app/core/layouts/standalone_form_layout";
import {
  Button,
  StyledFieldTextareaProse,
  styledInlineA,
  TextWell,
} from "app/components/elements";
import { Formik, Form } from "formik";
import { useState } from "react";
import LabeledTextField from "app/core/components/LabeledTextField";
import { SUPPORT_EMAIL } from "app/lib/constants";
import submitFeedbackCancelled from "app/auth/mutations/submitFeedbackCancelled";
import toast from "react-hot-toast";
import { useMutation } from "@blitzjs/rpc";

const FeedbackPage: BlitzPage = () => {
  const [submitFeedbackMutation] = useMutation(submitFeedbackCancelled);
  const [sent, setSent] = useState<boolean>(false);
  return (
    <div className="space-y-4">
      <TextWell>
        <p>
          Thanks for trying out Placemark. Sorry it didn't work out for you. If
          you have any feedback, please let us know -{" "}
          <a className={styledInlineA} href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>{" "}
          or just dropping a note here!
        </p>
      </TextWell>
      {sent ? (
        <div className="py-6">
          <TextWell>
            <i>Thanks for sending feedback! We really, really appreciate it.</i>
          </TextWell>
        </div>
      ) : null}
      <Formik
        initialValues={{
          email: "",
          text: "",
        }}
        onSubmit={async (values) => {
          await toast.promise(
            submitFeedbackMutation({
              body: values.text,
              email: values.email,
              userAgent: navigator.userAgent,
              location: window.location.href,
            }),
            {
              loading: "Submitting feedback…",
              success: "Thanks for your feedback!",
              error: "Had a problem submitting feedback",
            }
          );
          setSent(true);
          setTimeout(() => {
            window.location.href = "https://www.placemark.io/";
          }, 2000);
        }}
      >
        <Form className="space-y-2">
          <StyledFieldTextareaProse
            as="textarea"
            name="text"
            rows="6"
            placeholder="Your feedback, please? 🙂"
          />
          <LabeledTextField
            label="Email (optional), if you want a response!"
            type="email"
            name="email"
          />
          <div className="pb-4">
            <Button type="submit" variant="primary">
              Send
            </Button>
          </div>
        </Form>
      </Formik>
    </div>
  );
};

FeedbackPage.getLayout = (page) => (
  <StandaloneFormLayout title="Feedback">{page}</StandaloneFormLayout>
);

export default FeedbackPage;
