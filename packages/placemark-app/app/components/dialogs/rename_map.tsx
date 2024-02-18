import { useMutation, invalidateQuery } from "@blitzjs/rpc";
import { Pencil1Icon } from "@radix-ui/react-icons";
import { DialogHeader } from "app/components/dialog";
import { Formik, Form } from "formik";
import { LabeledTextField } from "app/core/components/LabeledTextField";
import type { ModalStateRenameMap } from "state/jotai";
import SimpleDialogActions from "app/components/dialogs/simple_dialog_actions";
import getWrappedFeatureCollection from "app/wrappedFeatureCollections/queries/getWrappedFeatureCollection";
import editWrappedFeatureCollectionMutation from "app/wrappedFeatureCollections/mutations/editWrappedFeatureCollection";
import getWrappedFeatureCollectionTree from "app/wrappedFeatureCollections/queries/getWrappedFeatureCollectionTree";

interface RenameForm {
  name: string;
}

export function RenameMapDialog({
  onClose,
  modal,
}: {
  onClose: () => void;
  modal: ModalStateRenameMap;
}) {
  const [editWrappedFeatureCollection] = useMutation(
    editWrappedFeatureCollectionMutation
  );

  async function onSubmit(values: RenameForm) {
    await editWrappedFeatureCollection({
      id: modal.id,
      name: values.name,
    });
    await invalidateQuery(getWrappedFeatureCollection, { id: modal.id });
    await invalidateQuery(getWrappedFeatureCollectionTree, {});
    onClose();
  }

  return (
    <>
      <DialogHeader title="Rename map" titleIcon={Pencil1Icon} />
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
          <SimpleDialogActions action="Rename map" onClose={onClose} />
        </Form>
      </Formik>
    </>
  );
}
