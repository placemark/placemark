import React, { memo, useCallback, useState } from "react";
import type { VirtualItem } from "react-virtual";
import * as DD from "@radix-ui/react-dropdown-menu";
import * as P from "@radix-ui/react-popover";
import { virtualPositionTop } from "../feature_table";
import * as E from "app/components/elements";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { useSetAtom } from "jotai";
import * as Sentry from "@sentry/nextjs";
import { dataAtom, dialogAtom, virtualColumnsAtom } from "state/jotai";
import { usePersistence } from "app/lib/persistence/context";
import { deletePropertyKey } from "app/lib/map_operations/delete_property_key";
import without from "lodash/without";
import { useAtomCallback } from "jotai/utils";
import { useFeatureMap } from "app/lib/persistence/shared";
import renameProperty from "app/lib/rename_property";
import { Formik, Form } from "formik";

type RenameFormValues = {
  renameTo: string;
};

export function RenamePropertyDialog({
  onClose,
  column,
  localOrder,
}: {
  onClose: () => void;
  column: string;
  localOrder: React.MutableRefObject<string[]>;
}) {
  const rep = usePersistence();
  const transact = rep.useTransact();
  const featureMap = useFeatureMap();

  const onSubmit = async (values: RenameFormValues) => {
    await transact({
      note: "Renamed a property",
      track: "property-rename",
      putFeatures: Array.from(featureMap.values(), (wrappedFeature) => {
        return {
          ...wrappedFeature,
          feature: {
            ...wrappedFeature.feature,
            properties: renameProperty(
              wrappedFeature.feature.properties,
              column,
              values.renameTo
            ),
          },
        };
      }),
    });
    for (let i = 0; i < localOrder.current.length; i++) {
      if (localOrder.current[i] === column) {
        localOrder.current[i] = values.renameTo;
      }
    }
    onClose();
  };

  return (
    <Formik
      onSubmit={onSubmit}
      initialValues={{
        renameTo: column,
      }}
    >
      <Form>
        <div className="flex items-center gap-x-2">
          <E.StyledField
            required
            name="renameTo"
            spellCheck="false"
            type="text"
          />
          <E.Button type="submit" variant="primary">
            Rename
          </E.Button>
        </div>
      </Form>
    </Formik>
  );
}

export const Header = memo(function Header({
  virtualColumn,
  statsOpen,
  column,
  localOrder,
  ...props
}: {
  virtualColumn: VirtualItem;
  column: string;
  localOrder: React.MutableRefObject<string[]>;
  statsOpen: boolean;
} & React.HTMLAttributes<HTMLButtonElement>) {
  const rep = usePersistence();
  const transact = rep.useTransact();
  const setDialogState = useSetAtom(dialogAtom);
  const setVirtualColumns = useSetAtom(virtualColumnsAtom);

  const onDelete = useAtomCallback(
    useCallback(
      (get, set) => {
        if (
          !confirm(
            "Are you sure you want to delete this property across all features?"
          )
        )
          return;
        transact({
          note: "Deleted a property from all features",
          putFeatures: Array.from(
            get(dataAtom).featureMap.values(),
            (wrappedFeature) => {
              return {
                ...wrappedFeature,
                feature: deletePropertyKey(wrappedFeature.feature, {
                  key: column,
                }),
              };
            }
          ),
        })
          .then(() => {
            localOrder.current = without(localOrder.current, column);
            set(virtualColumnsAtom, []);
          })
          .catch((e) => Sentry.captureException(e));
      },
      [column, localOrder, transact]
    )
  );

  const [renameOpen, setRenameOpen] = useState<boolean>(false);

  return (
    <div style={virtualPositionTop(virtualColumn)} className="absolute flex">
      <P.Root open={renameOpen} onOpenChange={(open) => setRenameOpen(open)}>
        <P.Trigger></P.Trigger>
        <DD.Root>
          <DD.Trigger title={column} {...props}>
            <div title={column} className="truncate flex-auto">
              {column}
            </div>
            <DotsHorizontalIcon className="opacity-20 group-hover:opacity-100" />
          </DD.Trigger>
          <E.DDContent align="end">
            <E.StyledItem
              onSelect={() => {
                setDialogState({
                  type: "cast_property",
                  column,
                });
              }}
            >
              Cast
            </E.StyledItem>
            <E.StyledItem
              onSelect={(_e) => {
                setTimeout(() => {
                  setRenameOpen(true);
                }, 50);
              }}
            >
              Rename
            </E.StyledItem>
            <E.DDSeparator />
            <E.StyledItem variant="destructive" onSelect={onDelete}>
              Delete
            </E.StyledItem>
          </E.DDContent>
        </DD.Root>
        <E.PopoverContent2>
          <RenamePropertyDialog
            column={column}
            localOrder={localOrder}
            onClose={() => {
              setRenameOpen(false);
              setVirtualColumns((cols) => cols.slice());
            }}
          />
        </E.PopoverContent2>
      </P.Root>
    </div>
  );
});
