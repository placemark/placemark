import { ClipboardIcon, DownloadIcon } from "@radix-ui/react-icons";
import { DialogHeader } from "app/components/dialog";
import { styledInlineA, TextWell } from "app/components/elements";
import { useImportString } from "app/hooks/use_import";
import { DEFAULT_IMPORT_OPTIONS } from "app/lib/convert";
import React from "react";
import toast from "react-hot-toast";
import { useQuery as useReactQuery } from "react-query";
import { z } from "zod";

const ExampleList = z.array(z.string());

function friendlyName(filename: string): string {
  let string = filename.split(".")[0].replace(/^ne_(\d+)m_/, "");
  string = string
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  string = string.charAt(0).toUpperCase() + string.slice(1);
  return string;
}

export function ImportExampleDialog({ onClose }: { onClose: () => void }) {
  const doImport = useImportString();
  const { data: exampleList } = useReactQuery(
    "import-examples",
    () =>
      fetch("https://data-library.placemark.io/")
        .then((r) => r.json())
        .then((json) => {
          return ExampleList.parse(json);
        }),
    {
      suspense: true,
    }
  );

  return (
    <>
      <DialogHeader title="Data library" titleIcon={ClipboardIcon} />
      <TextWell>
        The data library includes commonly-used datasets ready to add to your
        map.
      </TextWell>
      <div className="overflow-y-auto placemark-scrollbar max-h-48 mt-4 border border-gray-200 dark:border-gray-700 rounded">
        <div className="grid gap-1 p-1">
          {exampleList?.map((example) => {
            const nice = friendlyName(example);
            return (
              <button
                className="text-left text-sm group rounded hover:bg-gray-200 dark:hover:bg-gray-700 p-1"
                key={example}
                onClick={async () => {
                  await toast.promise(
                    fetch(`https://data-library.placemark.io/${example}`)
                      .then((r) => r.text())
                      .then((geojson) => {
                        return doImport(
                          geojson,
                          {
                            ...DEFAULT_IMPORT_OPTIONS,
                            type: "geojson",
                          },
                          () => {},
                          nice
                        );
                      }),
                    {
                      loading: "Loading…",
                      success: "Loaded",
                      error: "Error loading from the data library",
                    }
                  );
                  onClose();
                }}
              >
                <DownloadIcon className="inline-flex mr-2" />
                {nice}
              </button>
            );
          })}
        </div>
      </div>
      <div className="h-3" />
      <TextWell size="xs">
        Some data from{" "}
        <a className={styledInlineA} href="https://naturalearthdata.com/">
          naturalearthdata.com
        </a>
        .
      </TextWell>
    </>
  );
}
