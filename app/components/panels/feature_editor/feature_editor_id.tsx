import React from "react";
import { usePersistence } from "app/lib/persistence/context";
import type { IWrappedFeature } from "types";
import { PanelDetailsCollapsible } from "app/components/panel_details";
import { dialogAtom, panelIdOpen } from "state/jotai";
import {
  Button,
  inputClass,
  StyledField,
  StyledLabelSpan,
} from "app/components/elements";
import { Formik, Form } from "formik";
import * as Sentry from "@sentry/nextjs";
import toast from "react-hot-toast";
import { CopyIcon, QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import { getAPIURLFeature } from "app/lib/api";
import { writeToClipboard } from "app/lib/utils";
import { useSetAtom } from "jotai";

export function FeatureEditorId({
  wrappedFeature,
}: {
  wrappedFeature: IWrappedFeature;
}) {
  const rep = usePersistence();
  const [meta] = rep.useMetadata();
  const transact = rep.useTransact();
  const setDialog = useSetAtom(dialogAtom);

  async function copyAPI() {
    if (meta.type !== "persisted") {
      toast.error("Attempted to copy API, but this map isn’t saved");
      return;
    }
    const apiURL = getAPIURLFeature(meta, wrappedFeature.id);
    await writeToClipboard(apiURL)
      .then(() => {
        toast("Copied");
      })
      .catch((e) => {
        Sentry.captureException(e);
        toast.error("Failed to copy. Try again?");
      });
  }

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
          {meta.type === "persisted" ? (
            <>
              <StyledLabelSpan size="xs">API</StyledLabelSpan>
              {meta.access === "PUBLIC" ? (
                <div className="flex items-stretch gap-x-2">
                  <input
                    className={inputClass({ _size: "xs" })}
                    value={getAPIURLFeature(meta, wrappedFeature.id)}
                  />
                  <Button
                    type="button"
                    size="xs"
                    onClick={() => {
                      void copyAPI();
                    }}
                  >
                    <CopyIcon className="w-3 h-3" />
                    Copy
                  </Button>
                </div>
              ) : (
                <div
                  className="flex items-center
                  justify-between
                  text-xs
      text-gray-700 dark:text-gray-300"
                >
                  API disabled on private maps
                  <Button
                    size="xs"
                    onClick={() => {
                      setDialog({ type: "api" });
                    }}
                  >
                    Settings
                  </Button>
                </div>
              )}
            </>
          ) : null}
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
