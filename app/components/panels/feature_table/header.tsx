import {
  DotsHorizontalIcon,
  DoubleArrowDownIcon,
  DoubleArrowUpIcon,
} from "@radix-ui/react-icons";
import type { VirtualItem } from "@tanstack/react-virtual";
import * as E from "app/components/elements";
import { deletePropertyKey } from "app/lib/map_operations/delete_property_key";
import { usePersistence } from "app/lib/persistence/context";
import { useFeatureMap } from "app/lib/persistence/shared";
import renameProperty from "app/lib/rename_property";
import clsx from "clsx";
import { Form, Formik } from "formik";
import { captureException } from "integrations/errors";
import { useAtom, useSetAtom } from "jotai";
import { useAtomCallback } from "jotai/utils";
import without from "lodash/without";
import { DropdownMenu as DD, Popover as P } from "radix-ui";
import type React from "react";
import { memo, useCallback, useState } from "react";
import {
  dataAtom,
  dialogAtom,
  tableFilterAtom,
  virtualColumnsAtom,
} from "state/jotai";
import { virtualPositionTop } from "../feature_table";

type RenameFormValues = {
  renameTo: string;
};

function RenamePropertyDialog({
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
              values.renameTo,
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
  const [filter, setFilter] = useAtom(tableFilterAtom);

  const onDelete = useAtomCallback(
    useCallback(
      (get, set) => {
        if (
          !confirm(
            "Are you sure you want to delete this property across all features?",
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
            },
          ),
        })
          .then(() => {
            localOrder.current = without(localOrder.current, column);
            set(virtualColumnsAtom, []);
          })
          .catch((e) => captureException(e));
      },
      [column, localOrder, transact],
    ),
  );

  const [renameOpen, setRenameOpen] = useState<boolean>(false);

  function setSort(direction: "asc" | "desc") {
    setFilter((filter) => {
      if (
        filter.sort?.column === column &&
        filter.sort?.direction === direction
      ) {
        return {
          ...filter,
          sort: null,
        };
      }
      return {
        ...filter,
        sort: {
          column,
          direction: direction,
        },
      };
    });
  }

  return (
    <div style={virtualPositionTop(virtualColumn)} className="absolute flex">
      <P.Root open={renameOpen} onOpenChange={(open) => setRenameOpen(open)}>
        <P.Trigger></P.Trigger>
        <DD.Root>
          <DD.Trigger
            title={column}
            {...props}
            className={clsx(
              props.className,
              filter.sort?.column === column ? "bg-purple-100 font-bold" : "",
            )}
          >
            <div title={column}>{column}</div>
            {filter.sort?.column === column ? (
              filter.sort?.direction === "asc" ? (
                <DoubleArrowUpIcon className="w-3 h-3" />
              ) : (
                <DoubleArrowDownIcon className="w-3 h-3" />
              )
            ) : null}
            <DotsHorizontalIcon className="opacity-20 group-hover:opacity-100" />
          </DD.Trigger>
          <E.DDContent align="end">
            <E.StyledItem
              className={
                filter.sort?.direction === "asc" &&
                filter.sort.column === column
                  ? "bg-purple-200 font-bold"
                  : ""
              }
              onSelect={(_e) => {
                setSort("asc");
              }}
            >
              <DoubleArrowUpIcon className="w-3 h-3" />
              Sort asc
            </E.StyledItem>
            <E.StyledItem
              className={
                filter.sort?.direction === "desc" &&
                filter.sort.column === column
                  ? "bg-purple-200 font-bold"
                  : ""
              }
              onSelect={(_e) => {
                setSort("desc");
              }}
            >
              <DoubleArrowDownIcon className="w-3 h-3" />
              Sort desc
            </E.StyledItem>
            <E.DDSeparator />
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
