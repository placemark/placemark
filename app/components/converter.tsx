import {
  Button,
  DefaultErrorBoundary,
  Loading,
  StyledFieldTextareaCode,
  StyledLabelSpan,
  TextWell,
} from "./elements";
import * as Sentry from "@sentry/nextjs";
import { Formik, FormikHelpers, Form, ErrorMessage } from "formik";
import {
  ImportOptions,
  DEFAULT_IMPORT_OPTIONS,
  ExportOptions,
  DEFAULT_EXPORT_GEOJSON_OPTIONS,
  fromGeoJSON,
  stringToGeoJSON,
  ExportedData,
  FILE_TYPES,
} from "app/lib/convert";
import { ConvertResult } from "app/lib/convert/utils";
import * as Comlink from "comlink";
import { transfer } from "comlink";
import { CoordinateStringOptionsForm } from "./coordinate_string_options_form";
import { CsvOptionsForm, XlsOptionsForm } from "./csv_options_form";
import { SelectFileTypeField } from "./fields";
import { useAtom } from "jotai";
import { atomWithMachine } from "jotai-xstate";
import { assign, createMachine } from "xstate";
import { Fragment, Suspense, useEffect } from "react";
import { getFilesFromDataTransferItems } from "@placemarkio/flat-drop-files";
import {
  DownloadIcon,
  FileTextIcon,
  InfoCircledIcon,
  ResetIcon,
  ShuffleIcon,
} from "@radix-ui/react-icons";
import { lib } from "app/lib/worker";
import { GeoJSONOptions } from "./dialogs/export";
import { EitherAsync } from "purify-ts/EitherAsync";
import { Data } from "state/jotai";
import { newFeatureId } from "app/lib/id";
import { flattenRoot } from "app/hooks/use_import";
import { fileOpen, fileSave } from "browser-fs-access";
import { AutoDetect } from "./dialogs/autodetect";

type InputData =
  | {
      type: "file";
      data: File;
    }
  | {
      type: "text";
    };

async function getAndGroupFiles(
  event: React.SyntheticEvent
): Promise<InputData> {
  const files =
    event.nativeEvent instanceof DragEvent &&
    event.nativeEvent.dataTransfer?.items
      ? await getFilesFromDataTransferItems(
          event.nativeEvent.dataTransfer.items
        )
      : null;

  if (!files?.length) {
    throw new Error(
      `No files were found in that upload. Maybe it was an empty folder?`
    );
  }

  return {
    type: "file",
    data: files[0],
  };
}

const createEditableMachine = () =>
  createMachine<{
    inputData: InputData | null;
    dragEvent: DragEvent | null;
    exportedData: ExportedData | null;
    error: Error | null;
  }>(
    {
      predictableActionArguments: true,
      id: "editable",
      initial: "idle",
      context: {
        inputData: null,
        dragEvent: null,
        exportedData: null,
        error: null,
      },
      states: {
        idle: {
          on: {
            dragover: "dragging",
            pick: "manual_pick",
            CONVERT_TEXT: {
              target: "converting",
              actions: [
                assign({
                  inputData: (_, _event) => {
                    return {
                      type: "text",
                      data: "",
                    };
                  },
                }),
              ],
            },
          },
        },
        manual_pick: {
          invoke: {
            id: "manualPick",
            src: (_context, _event) => {
              return fileOpen({
                description: "Files to convert",
              });
            },
            onDone: {
              target: "converting",
              actions: assign({
                inputData: (_, event) => {
                  return {
                    type: "file",
                    data: event.data,
                  } as InputData;
                },
              }),
            },
            onError: {
              target: "idle",
            },
          },
        },
        dragging: {
          on: {
            dragleave: "idle",
            drop: {
              target: "grouping",
              actions: [
                assign({
                  dragEvent: (_, event) => {
                    if (event instanceof Event) {
                      event.preventDefault();
                    }
                    return event as DragEvent;
                  },
                }),
              ],
            },
          },
        },
        error: {
          on: {
            DISMISS_ERROR: {
              target: "idle",
            },
          },
        },
        grouping: {
          invoke: {
            id: "getAndGroupFiles",
            src: (_context, event) => {
              return getAndGroupFiles(event as React.SyntheticEvent);
            },
            onDone: {
              target: "converting",
              actions: assign({
                inputData: (_, event) => {
                  return event.data as InputData;
                },
                dragEvent: (_, _event) => {
                  return null;
                },
              }),
            },
            onError: {
              target: "error",
              actions: assign({
                error: (_context, event) => event.data as Error,
              }),
            },
          },
        },
        converting: {
          on: {
            exported: {
              target: "download",
              actions: assign({
                exportedData: (_ctx, event) => {
                  return event.exportedData as ExportedData;
                },
              }),
            },
          },
        },
        download: {},
      },
      on: {
        cancel: {
          target: "idle",
          actions: assign({
            inputData: (_ctx, _event) => {
              return null;
            },
            exportedData: (_ctx, _event) => {
              return null;
            },
          }),
        },
      },
    },
    {
      actions: {
        preventDefault: (_context, e) => {
          if (e instanceof Event) {
            e.preventDefault();
            e.stopPropagation();
          }
        },
      },
    }
  );

const editableMachineAtom = atomWithMachine((_get) => createEditableMachine());

type FormOptions = ImportOptions &
  ExportOptions & {
    exportType: ExportOptions["type"];
    text: string;
  };

function convertResultToExportInput(
  result: ConvertResult
): Pick<Data, "featureMap" | "folderMap"> {
  const featureMap: Data["featureMap"] = new Map();
  const folderMap: Data["folderMap"] = new Map();
  switch (result.type) {
    case "geojson": {
      const { features } = result.geojson;
      for (const feature of features) {
        const id = newFeatureId();
        featureMap.set(id, {
          feature,
          at: "a0",
          folderId: null,
          id,
        });
      }
      break;
    }
    case "root": {
      const flat = flattenRoot(result.root, [], [], null);
      for (const feature of flat.putFeatures) {
        featureMap.set(feature.id, feature);
      }
      for (const folder of flat.putFolders) {
        folderMap.set(folder.id, folder);
      }
    }
  }
  return { featureMap, folderMap };
}

export function CustomError({ children }: React.PropsWithChildren<unknown>) {
  return (
    <div
      role="alert"
      className="pb-4 text-md flex items-start gap-x-1 text-red-700 dark:text-red-300"
    >
      <InfoCircledIcon className="flex-shrink-0" style={{ marginTop: 2 }} />
      Sorry, couldn’t convert that - that file might not be valid, or the
      correct type. ({Array.isArray(children) ? children.join(", ") : children})
    </div>
  );
}

function convert({
  inputData,
  values,
}: {
  inputData: InputData;
  values: FormOptions;
}) {
  return EitherAsync<Error, ExportedData>(async ({ liftEither }) => {
    let res: ConvertResult;

    switch (inputData.type) {
      case "file": {
        const arrayBuffer = await inputData.data.arrayBuffer();
        res = await liftEither(
          await lib.fileToGeoJSON(
            transfer(arrayBuffer, [arrayBuffer]),
            values,
            Comlink.proxy(() => {})
          )
        );
        break;
      }
      case "text": {
        res = await liftEither(
          await stringToGeoJSON(
            values.text,
            values,
            Comlink.proxy(() => {})
          )
        );
      }
    }

    const toExport = convertResultToExportInput(res);

    const exported = await liftEither(
      await fromGeoJSON(toExport, {
        ...values,
        type: values.exportType,
      })
    );

    return exported;
  });
}

const INITIAL_VALUES: FormOptions = {
  ...DEFAULT_IMPORT_OPTIONS,
  type: "geojson",
  folderId: null,
  text: "",
  exportType: "geojson",
  geojsonOptions: DEFAULT_EXPORT_GEOJSON_OPTIONS,
};

function ConvertFile() {
  const [state, send] = useAtom(editableMachineAtom);

  const { inputData } = state.context;

  if (!inputData) {
    send("cancel");
    return null;
  }

  const input = inputData.type === "file" ? inputData.data : null;

  return (
    <Formik
      onSubmit={async function onSubmit(
        values: FormOptions,
        helpers: FormikHelpers<FormOptions>
      ) {
        await convert({ inputData, values })
          .ifLeft((e) => {
            helpers.setErrors({
              type: e.message,
            });
          })
          .ifRight((exportedData) => {
            send({
              type: "exported",
              exportedData: exportedData,
            });
          })
          .run();
      }}
      initialValues={INITIAL_VALUES}
    >
      {({ values }) => {
        return (
          <Form className="max-w-xl w-full">
            <div className="">
              <div>
                {inputData.type === "file" ? (
                  <div className="text-lg font-bold pb-6 truncate">
                    <FileTextIcon className="w-5 h-5 inline-block" />{" "}
                    {inputData.data.name}
                  </div>
                ) : (
                  <div className="pb-4">
                    <div>
                      <StyledLabelSpan>Input text</StyledLabelSpan>
                    </div>
                    <StyledFieldTextareaCode
                      aria-label="Data"
                      as="textarea"
                      placeholder="Paste or type data here…"
                      name="text"
                      autoFocus
                    />
                  </div>
                )}
                <ErrorMessage name="type" component={CustomError} />
                <div className="text-md font-bold pb-2">From:</div>
                <div className="space-y-4">
                  <SelectFileTypeField
                    name="type"
                    textOnly={inputData.type === "text"}
                  />
                  <CoordinateStringOptionsForm />
                  <CsvOptionsForm file={input || values.text} />
                  {inputData.type === "file" ? (
                    <Suspense fallback={<Loading />}>
                      <XlsOptionsForm file={inputData.data} />
                    </Suspense>
                  ) : null}
                </div>
                <div className="border-t border-gray-200 -mx-10 mt-8" />
                <div className="text-md font-bold pt-6 pb-2">To:</div>
                <div className="space-y-4">
                  <SelectFileTypeField exportable name="exportType" />
                  {values.exportType === "geojson" ? <GeoJSONOptions /> : null}
                  {values.exportType === "csv" ? (
                    <TextWell>
                      Warning: CSV exports only include Point & MultiPoint
                      features.
                    </TextWell>
                  ) : null}
                </div>
                <div className="pt-8 flex justify-between">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    onClick={() => send("CONVERT_TEXT")}
                  >
                    Convert
                  </Button>
                </div>
              </div>
            </div>
            {inputData.type === "file" ? (
              <AutoDetect file={inputData.data} />
            ) : null}
          </Form>
        );
      }}
    </Formik>
  );
}

function Download() {
  const [state, send] = useAtom(editableMachineAtom);
  const { exportedData } = state.context;
  if (!exportedData) {
    send("cancel");
    return null;
  }

  return (
    <div className="">
      <div className="text-center py-4">
        <div className="pb-4">Tada! {exportedData.result.name} is ready.</div>
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            fileSave(exportedData.result.blob, {
              description: "Save converted file",
              fileName: exportedData.result.name,
              extensions: exportedData.extensions,
            }).catch((e) => {
              Sentry.captureException(e);
            });
          }}
        >
          <DownloadIcon /> Download
        </Button>
        <div className="border-t border-gray-200 -mx-10 mt-8" />
        <div className="pt-8 text-center">
          <button
            className="inline inherit text-purple-500 underline"
            onClick={() => send("cancel")}
          >
            Start again
          </button>
          {" · "}
          <a className="text-purple-500 underline" href="https://placemark.io">
            🌎 Create maps with Placemark.
          </a>
          {" · "}
          <a
            href="mailto:support@placemark.io"
            className="text-purple-500 underline"
          >
            Feedback
          </a>
        </div>
      </div>
    </div>
  );
}

function IdleState({ dragging }: { dragging: boolean }) {
  const [, send] = useAtom(editableMachineAtom);

  return (
    <div
      className="text-sm flex flex-col items-stretch justify-stretch"
      onClick={() => send("pick")}
    >
      <div
        className={`text-xl text-center transition-all rounded ${
          dragging ? "outline-purple-500" : "outline-purple-100"
        } outline-dashed p-20`}
      >
        Drag a file here to start.
      </div>
      <div className="pt-4 flex gap-x-2 items-center text-md">
        Other options:
        <Button size="md" onClick={() => send("pick")}>
          Open a file
        </Button>
        <Button
          size="md"
          onClick={() => {
            send("CONVERT_TEXT");
          }}
        >
          Convert text
        </Button>
      </div>
    </div>
  );
}

function Grouping() {
  return <Loading />;
}

function ErrorState({ error }: { error: Error | null }) {
  return (
    <div className="max-w-xl w-full">
      <div
        className={`rounded-lg transition-all
          shadow-sm
          p-10 bg-white self-center justify-center text-sm flex
          flex-col
          items-center
          justify-stretch`}
      >
        <div className="text-md pb-4">Sorry, we encountered an error.</div>
        {error && error.message ? (
          <div className="text-center font-monospace">{error.message}</div>
        ) : null}
      </div>
    </div>
  );
}

const stopWindowDrag = (event: DragEvent) => {
  event.preventDefault();
};

export function Converter() {
  useEffect(() => {
    window.addEventListener("dragover", stopWindowDrag);
    window.addEventListener("drop", stopWindowDrag);

    return () => {
      window.removeEventListener("dragover", stopWindowDrag);
      window.removeEventListener("drop", stopWindowDrag);
    };
  });

  const [state, send] = useAtom(editableMachineAtom);

  return (
    <div
      className="min-h-screen mx-auto flex items-stretch flex-col"
      onDragOver={send}
      onDragLeave={send}
      onDrop={send}
    >
      <div className="text-purple-700 py-4 justify-start sm:flex justify-between px-4 text-2xl font-bold">
        <div className="flex items-center gap-x-2">
          <ShuffleIcon className="h-6 w-6" />
          Convert map data
        </div>
        <div>
          A free tool from{" "}
          <a className="underline" href="https://placemark.io/">
            Placemark
          </a>
        </div>
      </div>
      <div className="flex justify-center py-10 sm:py-20 px-10 sm:px-0">
        <div className="max-w-xl w-full">
          {state.matches("idle") || state.matches("dragging") ? null : (
            <div className="pb-4">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => {
                  send("cancel");
                }}
              >
                <ResetIcon />
                Start over
              </Button>
            </div>
          )}
          <div
            className={`transition-all p-10 bg-white border border-gray-300 rounded-md shadow-sm
            ${state.matches("dragging") ? "scale-110" : ""}
            `}
          >
            <DefaultErrorBoundary>
              {(state.matches("idle") || state.matches("dragging")) && (
                <IdleState dragging={state.matches("dragging")} />
              )}
              {state.matches("converting") && <ConvertFile />}
              {state.matches("grouping") && <Grouping />}
              {state.matches("manual_pick") && <Loading />}
              {state.matches("error") && (
                <ErrorState error={state.context.error} />
              )}
              {state.matches("download") && <Download />}
            </DefaultErrorBoundary>
          </div>
          {(state.matches("idle") || state.matches("dragging")) && (
            <div className="pt-4 text-sm leading-relaxed">
              Supports:{" "}
              {FILE_TYPES.map((type, i, list) => {
                return (
                  <Fragment key={type.id}>
                    <span>{type.label}</span>
                    {i === list.length - 1 ? "" : <span>, </span>}
                  </Fragment>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
