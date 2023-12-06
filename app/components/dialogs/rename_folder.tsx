import { useMutation, invalidateQuery } from "@blitzjs/rpc";
import { Pencil1Icon } from "@radix-ui/react-icons";
import { DialogHeader } from "app/components/dialog";
import { Formik, Form } from "formik";
import { LabeledTextField } from "app/core/components/LabeledTextField";
import SimpleDialogActions from "app/components/dialogs/simple_dialog_actions";
import getWrappedFeatureCollection from "app/wrappedFeatureCollections/queries/getWrappedFeatureCollection";
import editWrappedFeatureCollectionFolderMutation from "app/wrappedFeatureCollectionFolders/mutations/editWrappedFeatureCollectionFolder";
import getWrappedFeatureCollectionTree from "app/wrappedFeatureCollections/queries/getWrappedFeatureCollectionTree";
import { DialogStateRenameFolder } from "state/dialog_state";

interface RenameForm {
  name: string;
}

export function RenameFolderDialog({
  onClose,
  modal,
}: {
  onClose: () => void;
  modal: DialogStateRenameFolder;
}) {
  const [editWrappedFeatureCollectionFolder] = useMutation(
    editWrappedFeatureCollectionFolderMutation
  );

  async function onSubmit(values: RenameForm) {
    await editWrappedFeatureCollectionFolder({
      id: modal.id,
      folderId: modal.folderId,
      name: values.name,
    });
    await invalidateQuery(getWrappedFeatureCollection, { id: modal.id });
    await invalidateQuery(getWrappedFeatureCollectionTree, {});
    onClose();
  }

  return (
    <>
      <DialogHeader title="Rename folder" titleIcon={Pencil1Icon} />
      <Formik<RenameForm>
        onSubmit={onSubmit}
        initialValues={{ name: modal.name }}
      >
        <Form>
          <LabeledTextField
            name="name"
            label="Name"
            spellCheck="false"
            autoFocus
            type="text"
          />
          <SimpleDialogActions action="Rename folder" onClose={onClose} />
        </Form>
      </Formik>
    </>
  );
}
