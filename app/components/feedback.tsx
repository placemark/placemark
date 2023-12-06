import { useState } from "react";
import { useMutation } from "@blitzjs/rpc";
import * as Popover from "@radix-ui/react-popover";
import { Formik, Form } from "formik";
import {
  Button,
  CapsLabel,
  StyledFieldTextareaProse,
  StyledPopoverArrow,
  StyledPopoverContent,
} from "app/components/elements";
import { toast } from "react-hot-toast";
import submitFeedback from "app/auth/mutations/submitFeedback";
import { CaretRightIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import clsx from "clsx";

export function Feedback() {
  const [submitFeedbackMutation] = useMutation(submitFeedback);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showForm, setShowForm] = useState<boolean>(false);

  const commonClasses = "flex justify-between items-center w-full";

  return (
    <Popover.Root
      open={isOpen}
      onOpenChange={(val) => {
        setShowForm(false);
        setIsOpen(val);
      }}
    >
      <Popover.Trigger asChild>
        <Button variant="quiet">Feedback</Button>
      </Popover.Trigger>
      <Popover.Portal>
        <StyledPopoverContent>
          <StyledPopoverArrow />

          {showForm ? (
            <Formik
              initialValues={{
                body: "",
              }}
              onSubmit={async ({ body }) => {
                await toast.promise(
                  submitFeedbackMutation({
                    body,
                    userAgent: navigator.userAgent,
                    location: window.location.href,
                  }),
                  {
                    loading: "Submitting feedback…",
                    success: "Thanks for your feedback!",
                    error: "Had a problem submitting feedback",
                  }
                );
                setIsOpen(false);
              }}
            >
              <Form className="space-y-3">
                <CapsLabel>Feedback</CapsLabel>
                <StyledFieldTextareaProse
                  placeholder="Your feedback…"
                  as="textarea"
                  rows="3"
                  name="body"
                  size="sm"
                />
                <Button size="sm" type="submit" variant="primary">
                  Send
                </Button>
              </Form>
            </Formik>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <button
                className={clsx(commonClasses, "pb-2 pr-2 text-left")}
                onClick={() => {
                  setShowForm(true);
                }}
              >
                Send feedback
                <CaretRightIcon />
              </button>
              <a
                className={clsx(commonClasses, "hover:underline pt-2 pr-2")}
                href="https://placemark.canny.io/feature-requests"
                target="_blank"
                rel="noreferrer"
              >
                Request a feature
                <ExternalLinkIcon />
              </a>
            </div>
          )}
        </StyledPopoverContent>
      </Popover.Portal>
    </Popover.Root>
  );
}
