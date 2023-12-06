import Link from "next/link";
import { invalidateQuery, useMutation } from "@blitzjs/rpc";
import { Routes } from "@blitzjs/next";
import { useRouter } from "next/router";
import { useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { toast } from "react-hot-toast";
import {
  Button,
  styledButton,
  StyledDropDownArrow,
  DDContent,
  StyledItem,
  StyledPopoverContent,
  StyledPopoverArrow,
  PopoverTitleAndClose,
  StyledField,
} from "app/components/elements";
import createWrappedFeatureCollectionMutation from "app/wrappedFeatureCollections/mutations/createWrappedFeatureCollection";
import * as DD from "@radix-ui/react-dropdown-menu";
import { CaretDownIcon } from "@radix-ui/react-icons";
import { hackInitialDialog } from "./drop_index";
import { useQuery } from "react-query";
import { Step } from "app/components/walkthrough";
import { posthog } from "integrations/posthog_client";
import { FolderAdd16 } from "app/components/icons";
import * as P from "@radix-ui/react-popover";
import Form from "app/core/components/Form";
import createWrappedFeatureCollectionFolder from "app/wrappedFeatureCollectionFolders/mutations/createWrappedFeatureCollectionFolder";
import { CreateWrappedFeatureCollectionFolder } from "app/wrappedFeatureCollectionFolders/validations";
import { useParent } from "app/hooks/use_parent";
import getWrappedFeatureCollectionTree from "app/wrappedFeatureCollections/queries/getWrappedFeatureCollectionTree";
import { useCreateMap } from "app/hooks/use_create_map";

export function AddFolder() {
  const parent = useParent();
  const [createWrappedFeatureCollectionFolderMutation] = useMutation(
    createWrappedFeatureCollectionFolder
  );
  const [open, setOpen] = useState<boolean>(false);
  return (
    <P.Root open={open} onOpenChange={(open) => setOpen(open)}>
      <P.Trigger aria-label="Add folder" asChild>
        <Button variant="quiet" size="sm">
          <FolderAdd16 />
        </Button>
      </P.Trigger>
      <StyledPopoverContent align="end">
        <StyledPopoverArrow />
        <PopoverTitleAndClose title="Add folder" />
        <Form
          initialValues={{ name: "", folderId: null }}
          schema={CreateWrappedFeatureCollectionFolder}
          onSubmit={async (values, actions) => {
            await createWrappedFeatureCollectionFolderMutation({
              ...values,
              folderId: parent,
            });
            await invalidateQuery(getWrappedFeatureCollectionTree, {});
            actions.resetForm();
            setOpen(false);
          }}
        >
          <div className="flex items-center gap-x-2">
            <StyledField
              name="name"
              type="text"
              required
              innerRef={(elem: HTMLInputElement) => {
                if (elem) {
                  setTimeout(() => {
                    elem.focus();
                  }, 0);
                }
              }}
            />
            <Button type="submit">Add</Button>
          </div>
        </Form>
      </StyledPopoverContent>
    </P.Root>
  );
}

export function CreateMap({ mini = false }: { mini?: boolean }) {
  const router = useRouter();
  const [createWrappedFeatureCollection] = useMutation(
    createWrappedFeatureCollectionMutation
  );
  const { data: hasClipboard } = useQuery("has-clipboard", () => {
    return !!navigator.clipboard;
  });

  const { data: buttonText } = useQuery("new-map-experiment", () => {
    if (posthog.getFeatureFlag("newmap-button") === "newmap") {
      return "New map";
    } else {
      return "Create map";
    }
  });

  const { createMap, isSubmitting } = useCreateMap();

  if (mini) {
    return (
      <Button variant="primary" disabled={isSubmitting} onClick={createMap}>
        {buttonText}
      </Button>
    );
  }

  return (
    <div className="flex items-stretch gap-x-3">
      <AddFolder />
      <div className="flex items-stretch">
        <Step id="V1_00_CREATEMAP" onBeforeNext={createMap}>
          <Button
            side="left"
            variant="primary"
            disabled={isSubmitting}
            onClick={createMap}
          >
            {buttonText}
          </Button>
        </Step>
        <div style={{ width: 1 }} />
        <DD.Root>
          <DD.Trigger
            aria-label="More actions"
            className={
              styledButton({ variant: "primary" }) +
              " rounded-l-none border-l-0"
            }
            disabled={isSubmitting}
          >
            <CaretDownIcon />
          </DD.Trigger>
          <DDContent align="end">
            <StyledDropDownArrow />
            {hasClipboard ? (
              <StyledItem
                onClick={() => {
                  void router.push(Routes.Scratchpad());
                  toast
                    .promise(
                      navigator.clipboard.readText().then(async (text) => {
                        if (!text) {
                          throw new Error("No text to paste");
                        }
                        return createWrappedFeatureCollection({
                          name: "Map from clipboard",
                        }).then(async (map) => {
                          hackInitialDialog({
                            type: "load_text",
                            initialValue: text,
                          });
                          return await router.push(
                            Routes.PersistedMap({
                              wrappedFeatureCollectionId: map,
                            })
                          );
                        });
                      }),
                      {
                        success: "Created",
                        error: "Failed to read clipboard",
                        loading: "Creating…",
                      }
                    )
                    .catch((e) => {
                      Sentry.captureException(e);
                    });
                }}
              >
                New map from clipboard
              </StyledItem>
            ) : null}
            <StyledItem
              onClick={() => {
                void router.push(Routes.Scratchpad());
              }}
            >
              <Link href={Routes.Scratchpad()}>Create draft</Link>
            </StyledItem>
          </DDContent>
        </DD.Root>
      </div>
    </div>
  );
}
