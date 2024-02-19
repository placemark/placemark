import React from "react";
import { usePersistence } from "app/lib/persistence/context";
import type { IWrappedFeature } from "types";
import { PanelDetailsCollapsible } from "app/components/panel_details";
import { panelIdOpen } from "state/jotai";
import {
  Button,
  inputClass,
  StyledField,
  StyledLabelSpan,
} from "app/components/elements";
import { Formik, Form } from "formik";
import toast from "react-hot-toast";
import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";

export function FeatureEditorId({
  wrappedFeature,
}: {
  wrappedFeature: IWrappedFeature;
}) {
  const rep = usePersistence();
  const transact = rep.useTransact();

  return (
    <PanelDetailsCollapsible title="ID" atom={panelIdOpen}>
      <>
        <div
          className="contain-layout grid gap-x-2 gap-y-2 items-center"
          style={{
            gridTemplateColumns: "min-content 1fr",
          }}
        >
          <StyledLabelSpan size="xs">User</StyledLabelSpan>
          <div className="flex items-stretch">
            <Formik
              enableReinitialize
              key={wrappedFeature.feature.id}
              initialValues={{ id: wrappedFeature.feature.id || "" }}
              onSubmit={async (values, actions) => {
                if (values.id === undefined) {
                  return;
                }
                const id =
                  values.id === ""
                    ? undefined
                    : isNaN(+values.id)
                    ? values.id
                    : +values.id;
                await transact({
                  note: "Updated a feature’s id",
                  putFeatures: [
                    {
                      ...wrappedFeature,
                      feature: {
                        ...wrappedFeature.feature,
                        id,
                      },
                    },
                  ],
                });
                actions.resetForm();
                toast.success("Updated feature ID");
              }}
            >
              <Form className="flex-auto flex items-center gap-x-2">
                <StyledField
                  name="id"
                  spellCheck="false"
                  variant="code"
                  type="text"
                  _size="xs"
                  aria-label="ID"
                />
                <Button type="submit" size="xs">
                  Update
                </Button>
              </Form>
            </Formik>
          </div>
          <StyledLabelSpan size="xs">System</StyledLabelSpan>
          <input
            type="text"
            className={inputClass({ _size: "xs", variant: "code" })}
            value={wrappedFeature.id}
            readOnly
            aria-label="System ID"
          />
        </div>
        <div className="pt-2 text-right">
          <a
            href="https://www.placemark.io/documentation/ids"
            className="underline
            text-purple-500 hover:text-black
            dark:text-purple-300 dark:hover:text-purple-100
            inline-flex items-center gap-x-1 text-xs"
            rel="noreferrer"
            target="_blank"
          >
            <QuestionMarkCircledIcon />
            Help
          </a>
        </div>
      </>
    </PanelDetailsCollapsible>
  );
}
