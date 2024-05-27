import { Formik, Form, Field } from "formik";
import { IPersistence } from "app/lib/persistence/ipersistence";
import { useState } from "react";
import { IFolder } from "types";

interface RenameForm {
  name: string;
}

export function InlineNameEditor({
  folder,
  rep,
}: // count,
{
  folder: IFolder;
  rep: IPersistence;
  // count: number;
}) {
  const transact = rep.useTransact();
  const [editing, setEditing] = useState<boolean>(false);

  async function onSubmit(values: RenameForm) {
    await transact({
      note: "Renamed a folder",
      putFolders: [
        {
          ...folder,
          name: values.name,
        },
      ],
    });
    setEditing(false);
  }

  if (editing) {
    return (
      <div
        className="flex items-center flex-auto
      text-inherit text-gray-500 dark:text-gray-300"
      >
        <Formik<RenameForm>
          onSubmit={onSubmit}
          initialValues={{ name: folder.name }}
        >
          {({ isSubmitting, handleSubmit }) => (
            <Form className="flex-auto">
              <Field
                autoFocus
                className="bg-transparent w-full font-bold text-black dark:text-white bg-purple-100 dark:bg-purple-700"
                name="name"
                aria-label="Folder name"
                spellCheck="false"
                autoCapitalize="false"
                disabled={isSubmitting}
                onBlur={() => {
                  handleSubmit();
                }}
              />
            </Form>
          )}
        </Formik>
      </div>
    );
  }

  return (
    <div
      className="flex-auto font-semibold select-none truncate"
      title={folder.name}
      onDoubleClick={() => setEditing(true)}
    >
      {folder.name}
    </div>
  );
}
