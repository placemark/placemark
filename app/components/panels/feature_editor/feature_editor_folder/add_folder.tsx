import {
  Button,
  PopoverTitleAndClose,
  StyledField,
  StyledPopoverArrow,
  StyledPopoverContent,
} from "app/components/elements";
import { FolderAdd16 } from "app/components/icons";
import { newFeatureId } from "app/lib/id";
import { usePersistence } from "app/lib/persistence/context";
import { Form, Formik } from "formik";
import { captureException } from "integrations/errors";
import { useSetAtom } from "jotai";
import { Popover as P } from "radix-ui";
import { useState } from "react";
import { selectionAtom } from "state/jotai";

export function AddFolder() {
  const rep = usePersistence();
  const transact = rep.useTransact();
  const setSelection = useSetAtom(selectionAtom);
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
        <Formik
          initialValues={{ name: "" }}
          onSubmit={(values, actions) => {
            const id = newFeatureId();
            void transact({
              note: "Added a folder",
              track: "add-folder",
              putFolders: [
                {
                  id,
                  expanded: true,
                  folderId: null,
                  name: values.name,
                  locked: false,
                  visibility: true,
                },
              ],
            })
              .catch((e) => {
                captureException(e);
              })
              .then(() => {
                setSelection({
                  type: "folder",
                  id,
                });
              });
            actions.resetForm();
            setOpen(false);
          }}
        >
          <Form className="flex items-center gap-x-2">
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
          </Form>
        </Formik>
      </StyledPopoverContent>
    </P.Root>
  );
}
