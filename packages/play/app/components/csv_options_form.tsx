import React, { useState, useEffect } from "react";
import { useQuery } from "react-query";
import { dsvFormat } from "d3-dsv";
import { Field, FormikContextType, useFormikContext } from "formik";
import type { ImportOptions } from "app/lib/convert";
import { CSV_DELIMITERS, CSV_KINDS } from "app/lib/convert";
import { SelectHeader } from "app/components/csv_options_form/select_header";
import {
  FieldCheckbox,
  styledInlineA,
  StyledLabelSpan,
  styledRadio,
  styledSelect,
  TextWell,
} from "./elements";
import * as Sentry from "@sentry/nextjs";
import type { WorkBook } from "xlsx";
import { detectColumns } from "app/lib/convert/local/csv_to_geojson";
import { InlineError } from "./inline_error";
import { JsonObject } from "type-fest";
import { MAX_GEOCODER_ROWS } from "app/lib/constants";
import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import { useAtomValue } from "jotai";
import { dataAtom } from "state/jotai";
import { extractPropertyKeys } from "app/lib/multi_properties";

function KindSelector({ geocoder }: { geocoder: boolean }) {
  return (
    <div className="space-y-2">
      <div>
        <StyledLabelSpan>Kind</StyledLabelSpan>
      </div>
      <div className="grid grid-cols-3 items-center gap-2">
        {CSV_KINDS.filter((kind) => {
          if (geocoder) return true;
          return kind.value !== "addresses";
        }).map(({ value, label }) => (
          <label key={value} className="flex items-center gap-x-1">
            <Field
              type="radio"
              name="csvOptions.kind"
              className={styledRadio}
              value={value}
            />
            <StyledLabelSpan>{label}</StyledLabelSpan>
          </label>
        ))}
      </div>
    </div>
  );
}

/**
 * Overwrite some fields based on autodetected column names.
 * This logic is the same for CSV and XLSX files.
 */
function setAutodetectedFields(
  setFieldValue: FormikContextType<ImportOptions>["setFieldValue"],
  detected: ReturnType<typeof detectColumns>
) {
  if (detected.kind) {
    setFieldValue("csvOptions.kind", detected.kind);
  }
  if (detected.geometryHeader) {
    setFieldValue("csvOptions.geometryHeader", detected.geometryHeader);
  }
  // Lon lat
  setFieldValue("csvOptions.longitudeHeader", detected.longitudeHeader);
  setFieldValue("csvOptions.latitudeHeader", detected.latitudeHeader);
  // Zip
  setFieldValue("csvOptions.zipHeader", detected.zipHeader);
  setFieldValue("csvOptions.geocodingType", detected.geocodingType);
  // Single column
  setFieldValue(
    "csvOptions.geocodingHeaders.text",
    detected.geocodingHeaders.text
  );
  // Structured
  setFieldValue(
    "csvOptions.geocodingHeaders.address",
    detected.geocodingHeaders.address
  );
  setFieldValue(
    "csvOptions.geocodingHeaders.postalcode",
    detected.geocodingHeaders.postalcode
  );
  setFieldValue(
    "csvOptions.geocodingHeaders.country",
    detected.geocodingHeaders.country
  );
  setFieldValue(
    "csvOptions.geocodingHeaders.locality",
    detected.geocodingHeaders.locality
  );
}

const structuredColumns: Array<{
  value: keyof ImportOptions["csvOptions"]["geocodingHeaders"];
  label: string;
}> = [
  { value: "address", label: "Address" },
  { value: "neighbourhood", label: "Neighborhood" },
  { value: "borough", label: "Borough" },
  { value: "locality", label: "Locality (City)" },
  { value: "county", label: "County" },
  { value: "region", label: "Region (State, Province)" },
  { value: "postalcode", label: "Postcode" },
  { value: "country", label: "Country" },
];

type Columns = string[];

function LonLatHeaders({ columns }: { columns: Columns }) {
  return (
    <>
      <SelectHeader
        label="Latitude column"
        name="csvOptions.latitudeHeader"
        columns={columns}
      />
      <SelectHeader
        label="Longitude column"
        name="csvOptions.longitudeHeader"
        columns={columns}
      />
    </>
  );
}

function ZipHeaders({ columns }: { columns: Columns }) {
  return (
    <div className="col-span-2">
      <SelectHeader
        label="ZIP code column"
        name="csvOptions.zipHeader"
        columns={columns}
      />
    </div>
  );
}

function GeometryHeaders({
  kind,
  columns,
}: {
  kind: "WKT" | "GeoJSON" | "Polyline";
  columns: Columns;
}) {
  return (
    <div className="col-span-2">
      <SelectHeader
        label={`${kind} column`}
        name="csvOptions.geometryHeader"
        columns={columns}
      />
    </div>
  );
}

function StructuredHeaders({ columns }: { columns: Columns }) {
  return (
    <div className="col-span-3">
      <table className="divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="font-bold text-xs">Column</th>
            <th className="font-bold text-xs">Interpretation</th>
          </tr>
        </thead>
        <tbody>
          {structuredColumns.map((column, i) => {
            return (
              <tr key={i}>
                <td className="text-xs py-1 w-full truncate">{column.label}</td>
                <td className="py-1">
                  <Field
                    component="select"
                    name={`csvOptions.geocodingHeaders.${column.value}`}
                    className={styledSelect({ size: "xs" })}
                  >
                    <option value="">Select…</option>
                    <option disabled>---------------</option>
                    {columns.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </Field>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="pt-2">
        <TextWell>
          For files with location data in multiple columns. Match as many
          columns as you can for best results.
          <br />
          Geocoded files are limited to {MAX_GEOCODER_ROWS} rows. See{" "}
          <a
            href="https://www.placemark.io/documentation/importing-addresses"
            target="_blank"
            className={styledInlineA}
            rel="noreferrer"
          >
            more important documentation on importing addresses
          </a>
          .
        </TextWell>
      </div>
    </div>
  );
}

function HeaderSelectionsAddresses({
  columns,
  values,
}: {
  columns: Columns;
  values: ImportOptions;
}) {
  return (
    <>
      <label className="flex flex-col justify-stretch gap-y-2 col-span-2">
        <StyledLabelSpan>Geocoding strategy</StyledLabelSpan>
        <Field
          name="csvOptions.geocodingType"
          component="select"
          className={styledSelect({ size: "sm" })}
        >
          {[
            {
              value: "search",
              label: "All information in a single column",
            },
            {
              value: "structured",
              label: "Location information in multiple columns",
            },
          ].map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Field>
      </label>
      {values.csvOptions.geocodingType === "search" ? (
        <div className="col-span-3 space-y-2">
          <SelectHeader
            label="Address column"
            name="csvOptions.geocodingHeaders.text"
            noDefault
            columns={columns}
          />
          <TextWell>
            For files that have all of their location data in a single column.
            <br />
            Geocoded files are limited to {MAX_GEOCODER_ROWS} rows. See{" "}
            <a
              href="https://www.placemark.io/documentation/importing-addresses"
              target="_blank"
              className={styledInlineA}
              rel="noreferrer"
            >
              more important documentation on importing addresses
            </a>
            .
          </TextWell>
        </div>
      ) : (
        <StructuredHeaders columns={columns} />
      )}
    </>
  );
}

function JoinSettings({ columns }: { columns: Columns }) {
  const featureMap = useAtomValue(dataAtom).featureMap;
  const propertyKeys = extractPropertyKeys(featureMap);
  return (
    <>
      <SelectHeader
        noDefault
        label="Column in this file"
        name="csvOptions.joinSourceHeader"
        columns={columns}
      />
      <SelectHeader
        noDefault
        label="Column in map data"
        name="csvOptions.joinTargetHeader"
        columns={propertyKeys}
      />
      <div className="col-span-3 space-y-2">
        <TextWell>
          Join this spreadsheet against existing data on the map. This requires
          a column that matches exactly between the two datasets, ideally an ID
          or well-established code, like a FIPS code, state abbreviation, or ZIP
          code.
          <br />
          <a
            href="https://www.placemark.io/documentation/joining-data"
            className="underline"
            rel="noreferrer"
            target="_blank"
          >
            <QuestionMarkCircledIcon className="inline-block mr-1" />
            Documentation for joining data
          </a>
        </TextWell>
      </div>
    </>
  );
}

function HeaderSelections({
  values,
  columns,
}: {
  values: ImportOptions;
  columns: Columns;
}) {
  const kind = values.csvOptions.kind;
  switch (kind) {
    case "geojson": {
      return <GeometryHeaders kind="GeoJSON" columns={columns} />;
    }
    case "polyline": {
      return <GeometryHeaders kind="Polyline" columns={columns} />;
    }
    case "wkt": {
      return <GeometryHeaders kind="WKT" columns={columns} />;
    }
    case "lonlat": {
      return <LonLatHeaders columns={columns} />;
    }
    case "zip": {
      return <ZipHeaders columns={columns} />;
    }
    case "addresses": {
      return <HeaderSelectionsAddresses columns={columns} values={values} />;
    }
    case "join": {
      return <JoinSettings columns={columns} />;
    }
  }
}

export function CsvOptionsForm({
  file,
  geocoder = false,
}: {
  file: File | string;
  geocoder?: boolean;
}) {
  const { values, setFieldValue } = useFormikContext<ImportOptions>();
  const [columns, setColumns] = useState<Columns>([]);

  const {
    csvOptions: { delimiter },
    type,
  } = values;

  const noop = type !== "csv";

  useEffect(() => {
    if (noop) return;
    const slice = file.slice(0, 512);
    const head =
      typeof slice === "string" ? Promise.resolve(slice) : slice.text();
    void head
      .then((head) => {
        const headParsed = dsvFormat(delimiter).parse(head);
        const columns = headParsed.columns.filter(Boolean);
        const csvDetected = detectColumns(columns);
        setColumns(columns);
        setAutodetectedFields(setFieldValue, csvDetected);
      })
      .catch((e) => Sentry.captureException(e));
  }, [file, delimiter, setFieldValue, noop]);

  if (noop) return null;

  return (
    <>
      <KindSelector geocoder={geocoder} />
      <div className="grid grid-cols-3 gap-x-3 gap-y-3">
        <div>
          <label className="flex flex-col justify-stretch gap-y-2">
            <StyledLabelSpan>Delimiter</StyledLabelSpan>
            <Field
              name="csvOptions.delimiter"
              component="select"
              className={styledSelect({ size: "sm" })}
            >
              <option value="none">Select…</option>
              {CSV_DELIMITERS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Field>
          </label>
        </div>
        <HeaderSelections columns={columns} values={values} />
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-x-2">
          <FieldCheckbox type="checkbox" name="csvOptions.autoType" />
          <StyledLabelSpan>Infer types</StyledLabelSpan>
        </label>
        <TextWell>
          CSV files technically only contain string values. You can choose to
          infer number, boolean, and null values.
        </TextWell>
      </div>
    </>
  );
}

interface XlsOptionsFormProps {
  file: File;
  geocoder?: boolean;
}

export function XlsOptionsForm(props: XlsOptionsFormProps) {
  const { data: xlsx } = useQuery("xlsx", async () => import("xlsx"), {
    suspense: true,
  });

  return <XlsOptionsFormInner {...props} xlsx={xlsx!} />;
}

function XlsOptionsFormInner({
  file,
  geocoder = false,
  xlsx,
}: XlsOptionsFormProps & {
  xlsx: typeof import("xlsx");
}) {
  const { values, setFieldValue } = useFormikContext<ImportOptions>();
  const [columns, setColumns] = useState<Columns>([]);
  const [doc, setDoc] = useState<WorkBook | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    csvOptions: { sheet },
    type,
  } = values;

  const noop = type !== "xls";

  useEffect(() => {
    if (noop) return;
    void file
      .arrayBuffer()
      .then((array) => {
        const doc = xlsx.read(array, { type: "array" });
        setDoc(doc);
        const sheet = Object.keys(doc.Sheets)[0];
        setFieldValue("csvOptions.sheet", sheet);
        setError(null);
      })
      .catch((e) => {
        Sentry.captureException(e);
        setError("Could not parse spreadsheet");
      });
  }, [file, setFieldValue, noop, xlsx]);

  useEffect(() => {
    if (noop || !doc) return;
    const output = xlsx.utils.sheet_to_json(
      doc.Sheets[sheet]
    ) as unknown as JsonObject[];
    if (!output[0]) {
      // console.error(output, sheet);
      return;
    }
    const columns = Object.keys(output[0]).filter(Boolean);
    const csvDetected = detectColumns(columns);
    setColumns(columns);
    setAutodetectedFields(setFieldValue, csvDetected);
  }, [doc, sheet, setFieldValue, noop, xlsx]);

  if (error && !noop) {
    return <InlineError>{error}</InlineError>;
  }

  if (noop || !doc) return null;

  const sheets = Object.keys(doc.Sheets);

  return (
    <>
      <KindSelector geocoder={geocoder} />
      <div className="grid grid-cols-3 gap-x-3 gap-y-3">
        <div>
          <label className="flex flex-col justify-stretch gap-y-2">
            <StyledLabelSpan>Sheet</StyledLabelSpan>
            <Field
              name="csvOptions.sheet"
              component="select"
              className={styledSelect({ size: "sm" })}
            >
              <option value="none">Select…</option>
              {sheets.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Field>
          </label>
        </div>
        <HeaderSelections columns={columns} values={values} />
      </div>
    </>
  );
}
