import Head from "next/head";
import { useMutation, invalidateQuery } from "@blitzjs/rpc";
import getWrappedFeatureCollection from "app/wrappedFeatureCollections/queries/getWrappedFeatureCollection";
import { Formik, Form, Field } from "formik";
import type { PersistenceMetadataPersisted } from "app/lib/persistence/ipersistence";
import editWrappedFeatureCollectionMutation from "app/wrappedFeatureCollections/mutations/editWrappedFeatureCollection";
import React, { useState } from "react";
import { formatTitle, truncate } from "app/lib/utils";
import { ChevronRightIcon } from "@radix-ui/react-icons";
import getWrappedFeatureCollectionTree from "app/wrappedFeatureCollections/queries/getWrappedFeatureCollectionTree";

interface RenameForm {
  name: string;
}

function EditNameInline({
  metadata,
  done,
}: {
  metadata: PersistenceMetadataPersisted;
  done: () => void;
}) {
  const [editWrappedFeatureCollection] = useMutation(
    editWrappedFeatureCollectionMutation
  );

  async function onSubmit(values: RenameForm) {
    await editWrappedFeatureCollection({
      id: metadata.id,
      name: values.name,
    });
    await invalidateQuery(getWrappedFeatureCollection, {
      id: metadata.id,
    });
    await invalidateQuery(getWrappedFeatureCollectionTree, {});
    done();
  }

  return (
    <div
      className="flex items-center justify-self-center
      text-sm text-gray-500 dark:text-gray-300"
    >
      <Formik<RenameForm>
        onSubmit={onSubmit}
        initialValues={{ name: metadata.name }}
      >
        {({ isSubmitting, handleSubmit }) => (
          <Form>
            <Field
              autoFocus
              className="bg-gray-100 dark:bg-gray-600 max-w-64 text-black dark:text-white"
              name="name"
              aria-label="Map name"
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

export function PersistedInfo({
  metadata,
}: {
  metadata: PersistenceMetadataPersisted;
}) {
  const [editing, setEditing] = useState<boolean>(false);

  return (
    <>
      <Head>
        <title>{formatTitle(metadata.name)}</title>
      </Head>
      <div
        className="flex items-center gap-x-1 justify-self-center
      text-sm text-gray-500 dark:text-gray-300 select-none"
      >
        <ChevronRightIcon />
        <span>{truncate(metadata.organization.name, 14)}</span>
        <ChevronRightIcon />
        {editing ? (
          <EditNameInline metadata={metadata} done={() => setEditing(false)} />
        ) : (
          <button
            type="button"
            title="Edit map name"
            onClick={() => setEditing(true)}
            className="text-black dark:text-white cursor-pointer whitespace-nowrap truncate"
          >
            {truncate(metadata.name, 14)}
          </button>
        )}
      </div>
    </>
  );
}
