import { gSSP } from "app/blitz-server";
import Head from "next/head";
import { useQuery } from "@blitzjs/rpc";
import { getSession } from "@blitzjs/auth";
import { BlitzPage, Routes } from "@blitzjs/next";
import AuthenticatedPageLayout from "app/core/layouts/authenticated_page_layout";
import * as D from "@radix-ui/react-dialog";
import getOrganizations from "app/admin/queries/getOrganizations";
import {
  Button,
  H2,
  StyledDialogContent,
  StyledDialogOverlay,
  Table,
  TableHead,
  Tbody,
  Td,
  Th,
} from "app/components/elements";
import { formatCount } from "app/lib/utils";
import { CodeIcon } from "@radix-ui/react-icons";
import {
  Column,
  // Table as TTable,
  ColumnFiltersState,
  createColumnHelper,
  getFilteredRowModel,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import React, { useState } from "react";

type Org = Awaited<ReturnType<typeof getOrganizations>>[number];

const columnHelper = createColumnHelper<Org>();

const AdminPage: BlitzPage = () => {
  const [organizations] = useQuery(getOrganizations, null);

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Make some columns!
  const columns = [
    // Display Column
    columnHelper.display({
      id: "json",
      cell: (props) => {
        return (
          <D.Root>
            <D.Trigger asChild>
              <Button>
                <CodeIcon />
              </Button>
            </D.Trigger>
            <StyledDialogOverlay />
            <StyledDialogContent>
              <pre>{JSON.stringify(props.row.original, null, 2)}</pre>
            </StyledDialogContent>
          </D.Root>
        );
      },
    }),
    columnHelper.accessor("id", {
      enableColumnFilter: false,
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("name", {
      enableColumnFilter: false,
      header: "Name",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("createdAt", {
      enableColumnFilter: false,
      header: "Created",
      cell: (info) => info.getValue().toLocaleDateString(),
    }),
    columnHelper.accessor("_count.membership", {
      enableColumnFilter: false,
      header: "Members",
      cell: (info) => formatCount(info.getValue()),
    }),
    columnHelper.accessor("_count.wrappedFeatureCollections", {
      enableColumnFilter: false,
      header: "Maps",
      cell: (info) => formatCount(info.getValue()),
    }),
  ];

  const table = useReactTable({
    data: organizations,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: {
      columnFilters,
    },
    onColumnFiltersChange: setColumnFilters,

    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <title>Admin</title>
      </Head>
      <H2>Organizations</H2>
      <div className="h-4" />

      <Table>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableHead key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <Th key={header.id}>
                {header.column.getCanFilter() ? (
                  <div>
                    <Filter column={header.column} />
                  </div>
                ) : null}
                <button onClick={header.column.getToggleSortingHandler()}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  {{
                    asc: " 🔼",
                    desc: " 🔽",
                  }[header.column.getIsSorted() as string] ?? null}
                </button>
              </Th>
            ))}
          </TableHead>
        ))}
        <Tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <Td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Td>
              ))}
            </tr>
          ))}
        </Tbody>
      </Table>
    </>
  );
};

function Filter({
  column,
}: // table,
{
  column: Column<any, unknown>;
  // table: TTable<Org>;
}) {
  return (
    <>
      <input
        type="checkbox"
        checked={!!column.getFilterValue()}
        onChange={(e) => {
          e.stopPropagation();
          column.setFilterValue(e.target.checked);
        }}
      />
      <div className="h-1" />
    </>
  );
}

AdminPage.authenticate = { redirectTo: Routes.SigninPage().pathname };
AdminPage.getLayout = (page) => (
  <AuthenticatedPageLayout fullWidth title="Admin">
    {page}
  </AuthenticatedPageLayout>
);

export const getServerSideProps = gSSP(async ({ req, res }) => {
  const session = await getSession(req, res);

  if (!session.roles?.includes("SUPERADMIN")) {
    return {
      redirect: {
        destination: Routes.SigninPage().pathname,
        permanent: false,
      },
    };
  }

  return { props: {} };
});

export default AdminPage;
