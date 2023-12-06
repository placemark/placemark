import {
  CategoricalValues,
  ISymbolization,
  ISymbolizationNone,
  ISymbolizationCategorical,
  Symbolization,
  FeatureMap,
  ISymbolizationRamp,
  RampValues,
} from "types";
import { usePersistence } from "app/lib/persistence/context";
import * as Sentry from "@sentry/nextjs";
import { Fragment, useMemo, useState } from "react";
import { match } from "ts-pattern";
import {
  CaretDownIcon,
  CopyIcon,
  PlusIcon,
  ResetIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import * as Accordion from "@radix-ui/react-accordion";
import * as P from "@radix-ui/react-popover";
import {
  Button,
  inputClass,
  TextWell,
  StyledLabelSpan,
  StyledPopoverArrow,
  PopoverContent2,
  StyledPopoverTrigger,
  styledSelect,
  styledCheckbox,
  styledTextarea,
  Hint,
} from "app/components/elements";
import {
  ArrayHelpers,
  ErrorMessage,
  Field,
  FieldArray,
  FieldInputProps,
  FieldProps,
  Form,
  Formik,
  FormikProps,
} from "formik";
import { atom, useAtom, useAtomValue } from "jotai";
import {
  CBColors,
  COLORBREWER_ALL,
  COLORBREWER_DIVERGING,
  COLORBREWER_QUAL,
  COLORBREWER_SEQUENTIAL,
  CARTO_COLOR_DIVERGING,
  CARTO_COLOR_SEQUENTIAL,
  CARTO_COLOR_QUALITATIVE,
} from "app/lib/colorbrewer";
import find from "lodash/find";
import last from "lodash/last";
import { dataAtom, panelSymbolizationExportOpen } from "state/jotai";
import * as d3 from "d3-array";
import { ColorPopoverField } from "app/components/color_popover";
import { linearGradient } from "app/lib/color";
import { lerp, writeToClipboard } from "app/lib/utils";
import { InlineError } from "../inline_error";
import { EOption, exportStyle } from "app/lib/export_style";
import toast from "react-hot-toast";
import {
  PanelDetails,
  PanelDetailsCollapsible,
} from "app/components/panel_details";
import { useAutoSubmit } from "app/hooks/use_auto_submit";
import { purple900 } from "app/lib/constants";

const regenerateAtom = atom<boolean>(false);
const DEFAULT_CLASSES = 7;

function DoneButton() {
  return (
    <div>
      <P.Close asChild>
        <Button>Done</Button>
      </P.Close>
    </div>
  );
}

function InterpolateOption() {
  return (
    <>
      <StyledLabelSpan>Interpolate</StyledLabelSpan>
      <Field
        as="select"
        name="interpolate"
        required
        className={styledSelect({ size: "sm" }) + " w-full"}
      >
        <option value="linear">Linear</option>
        <option value="step">Step</option>
      </Field>
    </>
  );
}

export function getViablePropertiesForCategorical(featureMap: FeatureMap) {
  const categoryPropertyMap = new Map<string, Set<string | number>>();
  for (const wrappedFeature of featureMap.values()) {
    for (const [key, value] of Object.entries(
      wrappedFeature.feature.properties || {}
    )) {
      if (typeof value === "number" || typeof value === "string") {
        const oldValue = categoryPropertyMap.get(key);
        if (oldValue) {
          // by reference.
          oldValue.add(value);
        } else {
          categoryPropertyMap.set(key, new Set([value]));
        }
      }
    }
  }
  return categoryPropertyMap;
}

/**
 * Find properties that have categorical values.
 */
function useViablePropertiesForCategorical(featureMap: FeatureMap) {
  return useMemo(() => {
    return getViablePropertiesForCategorical(featureMap);
  }, [featureMap, featureMap.version]);
}

export function getNumericPropertyMap(featureMap: FeatureMap) {
  const numericPropertyMap = new Map<string, number[]>();
  for (const wrappedFeature of featureMap.values()) {
    for (const [key, value] of Object.entries(
      wrappedFeature.feature.properties || {}
    )) {
      if (typeof value === "number") {
        const oldValue = numericPropertyMap.get(key);
        if (oldValue) {
          // by reference.
          oldValue.push(value);
        } else {
          numericPropertyMap.set(key, [value]);
        }
      }
    }
  }
  for (const val of numericPropertyMap.values()) {
    val.sort();
  }
  return numericPropertyMap;
}

/**
 * Find properties that have numeric values.
 */
function useViablePropertiesForRamp(featureMap: FeatureMap) {
  return useMemo(() => {
    return getNumericPropertyMap(featureMap);
  }, [featureMap, featureMap.version]);
}

/**
 * Given a ramp name, number of classes, and whether to
 * interpolate, preview a ramp by generating a special
 * div with a linear gradient.
 */
function RampPreview({
  name,
  interpolate,
  classes,
}: {
  name: string;
} & Pick<RampValues, "interpolate" | "classes">) {
  const ramp = find(COLORBREWER_ALL, { name })!;
  const colors = ramp.colors[classes]! || ramp.colors[DEFAULT_CLASSES];

  return (
    <div
      title={name}
      className="w-full h-5 border"
      style={{
        background: linearGradient({
          colors,
          interpolate,
        }),
        borderColor: colors[colors.length - 1],
      }}
    />
  );
}

/**
 * Hidden input and label that previews the given ramp.
 */
function RampChoice({
  form,
  ramp,
  field,
}: {
  form: FormikProps<any>;
  ramp: CBColors;
  field: FieldInputProps<string>;
}) {
  return (
    <label
      key={ramp.name}
      className="hover:cursor-pointer hover:ring-1 dark:ring-white ring-gray-200"
    >
      <input className="hidden" type="radio" {...field} value={ramp.name} />
      <RampPreview
        name={ramp.name}
        classes={form.values.classes || DEFAULT_CLASSES}
        interpolate={form.values.interpolate || "step"}
      />
    </label>
  );
}

/**
 * NOTE: This both shows the options and handles
 * autosubmitting the whole form./
 */
function SimpleStyleOption() {
  useAutoSubmit();
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-x-2">
        <Field
          type="checkbox"
          className={styledCheckbox({ variant: "default" })}
          name="simplestyle"
        />
        <StyledLabelSpan>
          Allow literal styles in data{" "}
          <Hint>
            Allows features with simplestyle attributes to override data-driven
            styles.
          </Hint>
        </StyledLabelSpan>
      </label>
      <label className="flex items-center gap-x-2">
        <div className="whitespace-nowrap">
          <StyledLabelSpan>Default color</StyledLabelSpan>
        </div>
        <div className="flex-auto" />
        <Field
          component={ColorPopoverField}
          name="defaultColor"
          _size="sm"
          className={inputClass({
            _size: "sm",
          })}
        />
      </label>
      <label className="flex items-center gap-x-2">
        <div className="whitespace-nowrap">
          <StyledLabelSpan>Default fill opacity</StyledLabelSpan>
        </div>
        <div className="flex-auto" />
        <Field
          type="number"
          min="0"
          max="1"
          name="defaultOpacity"
          step="0.01"
          _size="sm"
          className={inputClass({
            _size: "sm",
          })}
        />
      </label>
    </div>
  );
}

function RampChoices({
  label,
  colors,
  fieldProps,
}: {
  label: string;
  colors: CBColors[];
  fieldProps: FieldProps<string>;
}) {
  return (
    <>
      <StyledLabelSpan>{label}</StyledLabelSpan>
      <div className="grid gap-x-2 gap-y-2 grid-cols-3">
        {colors.map((ramp) => {
          return (
            <RampChoice
              key={ramp.name}
              form={fieldProps.form}
              ramp={ramp}
              field={fieldProps.field}
            />
          );
        })}
      </div>
    </>
  );
}

function RampWizard() {
  const rep = usePersistence();
  const [meta, setMeta] = rep.useMetadata();
  const { featureMap } = useAtomValue(dataAtom);
  const options = useViablePropertiesForRamp(featureMap);
  const [regenerate, setRegenerate] = useAtom(regenerateAtom);
  const [formError, setFormError] = useState<string | null>(null);

  return regenerate ? (
    <Formik<RampValues>
      onSubmit={async (values) => {
        const ramp = COLORBREWER_ALL.find(
          (ramp) => ramp.name === values.rampName
        )!;
        const dataValues = options.get(values.property)!;
        const colors = ramp.colors[values.classes]!;

        function getStopsLinear({ colors }: { colors: string[] }) {
          const [min, max] = d3.extent(dataValues) as [number, number];
          return colors.map((output, i, arr) => {
            return {
              input: +lerp(min, max, i / (arr.length - 1)).toFixed(4),
              output,
            };
          });
        }

        function getStopsQuantile({ colors }: { colors: string[] }) {
          const stops = colors
            .map((output, i, arr) => {
              return {
                input: d3.quantile(dataValues, i / (arr.length - 1)) || 0,
                output,
              };
            })
            // Quantile stops could be repeated. Make sure they aren't.
            .filter((stop, i, stops) => {
              if (i === 0) return true;
              if (stops[i - 1].input === stop.input) return false;
              return true;
            });

          return stops;
        }

        const newSymbolization: ISymbolizationRamp = {
          type: "ramp",
          simplestyle: values.simplestyle,
          property: values.property,
          interpolate: values.interpolate,
          rampName: values.rampName,
          defaultColor: values.defaultColor,
          defaultOpacity: values.defaultOpacity,
          stops:
            values.breaks === "linear"
              ? getStopsLinear({ colors })
              : getStopsQuantile({ colors }),
        };

        await Promise.resolve(
          setMeta({
            symbolization: newSymbolization,
          })
        ).catch(() => {
          toast.error("Failed to generate ramp");
        });

        setRegenerate(false);
      }}
      initialValues={{
        property:
          meta.symbolization?.type === "ramp"
            ? meta.symbolization.property
            : "",
        defaultColor: purple900,
        defaultOpacity: meta.symbolization.defaultOpacity,
        interpolate:
          meta.symbolization?.type === "ramp"
            ? meta.symbolization.interpolate
            : "step",
        simplestyle:
          meta.symbolization?.type === "ramp"
            ? meta.symbolization.simplestyle
            : true,
        breaks: "linear",
        rampName: "RdPu",
        classes: DEFAULT_CLASSES,
      }}
    >
      <Form>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <label className="block">
              <div className="">
                <StyledLabelSpan>Input property</StyledLabelSpan>
              </div>
              <Field
                as="select"
                name="property"
                required
                className={styledSelect({ size: "sm" }) + " w-full"}
              >
                <option value={""}>Select…</option>
                {Array.from(options.keys(), (cat) => {
                  return (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  );
                })}
              </Field>
            </label>
            <label>
              <StyledLabelSpan>Class breaks</StyledLabelSpan>
              <Field
                as="select"
                name="breaks"
                required
                className={styledSelect({ size: "sm" }) + " w-full"}
              >
                <option value="linear">Linear</option>
                <option value="quantile">Quantile</option>
              </Field>
            </label>
            <div>
              <StyledLabelSpan>Ramp</StyledLabelSpan>
              <Field name="rampName">
                {(fieldProps: FieldProps<string>) => {
                  const { field, form } = fieldProps;
                  return (
                    <P.Root>
                      <StyledPopoverTrigger>
                        <RampPreview
                          name={field.value}
                          classes={form.values.classes}
                          interpolate={form.values.interpolate}
                        />
                        <CaretDownIcon className="w-5 h-5 flex-shrink-0" />
                      </StyledPopoverTrigger>
                      <PopoverContent2 side="left">
                        <StyledPopoverArrow />
                        <div
                          style={{
                            maxHeight: 480,
                          }}
                          className="space-y-2 p-1 overflow-y-auto placemark-scrollbar"
                        >
                          <div className="grid grid-cols-2 gap-x-2">
                            <label className="block">
                              <StyledLabelSpan>Classes</StyledLabelSpan>
                              <Field
                                as="select"
                                name="classes"
                                required
                                className={
                                  styledSelect({ size: "sm" }) + " w-full"
                                }
                              >
                                {d3.range(3, 8).map((count) => {
                                  return (
                                    <option key={count} value={String(count)}>
                                      {count}
                                    </option>
                                  );
                                })}
                              </Field>
                            </label>
                            <label className="block">
                              <InterpolateOption />
                            </label>
                          </div>
                          <div>
                            <RampChoices
                              label="Continuous (ColorBrewer)"
                              colors={COLORBREWER_SEQUENTIAL}
                              fieldProps={fieldProps}
                            />
                            <RampChoices
                              label="Continuous (CARTO Colors)"
                              colors={CARTO_COLOR_SEQUENTIAL}
                              fieldProps={fieldProps}
                            />
                          </div>
                          <div>
                            <RampChoices
                              label="Diverging (ColorBrewer)"
                              colors={COLORBREWER_DIVERGING}
                              fieldProps={fieldProps}
                            />
                            <RampChoices
                              label="Diverging (CARTO Colors)"
                              colors={CARTO_COLOR_DIVERGING}
                              fieldProps={fieldProps}
                            />
                          </div>
                          <DoneButton />
                        </div>
                      </PopoverContent2>
                    </P.Root>
                  );
                }}
              </Field>
            </div>
          </div>
          <div className="relative pt-2">
            <Button type="submit" variant="primary">
              Generate
            </Button>
          </div>
        </div>
      </Form>
    </Formik>
  ) : (
    <div>
      <Formik<ISymbolizationRamp>
        onSubmit={async (values) => {
          try {
            Symbolization.parse(values);
          } catch (e) {
            setFormError((e as Error).message);
            return;
          }
          setFormError(null);
          try {
            await Promise.resolve(
              setMeta({
                symbolization: values,
              })
            ).catch(() => {
              toast.error("Failed to generate ramp");
            });
          } catch (e) {
            Sentry.captureException(e);
          }
        }}
        validate={(values) => {
          const errors: Record<string, string> = {};
          let lastValue: null | number = values.stops[0]?.input;
          for (let i = 1; i < values.stops.length; i++) {
            const thisValue = values.stops[i].input;
            if (thisValue < lastValue) {
              errors[`stops`] =
                "Ramp input values need to be in ascending order.";
            }
            lastValue = thisValue;
          }
          return errors;
        }}
        initialValues={meta.symbolization as ISymbolizationRamp}
      >
        {({ values }) => {
          return (
            <Form className="space-y-4">
              {formError && <InlineError>{formError}</InlineError>}
              <SimpleStyleOption />
              <FieldArray name="stops">
                {(arrayHelpers: ArrayHelpers) => (
                  <div
                    className="w-full grid gap-2 items-center dark:text-white"
                    style={{
                      gridTemplateColumns: "1fr 1fr min-content",
                    }}
                  >
                    <div className="text-left font-normal">Value</div>
                    <div className="text-left font-normal col-span-2">
                      Output
                    </div>
                    {values.stops.map((_stop, i) => {
                      return (
                        <Fragment key={i}>
                          <div>
                            <Field
                              name={`stops.${i}.input`}
                              type="number"
                              className={inputClass({
                                _size: "sm",
                              })}
                            />
                          </div>
                          <div>
                            <Field
                              component={ColorPopoverField}
                              name={`stops.${i}.output`}
                              _size="sm"
                              className={inputClass({
                                _size: "sm",
                              })}
                            />
                          </div>
                          {values.stops.length > 1 ? (
                            <div>
                              <Button
                                variant="quiet"
                                aria-label="Delete stop"
                                onClick={() => {
                                  arrayHelpers.remove(i);
                                }}
                              >
                                <TrashIcon className="opacity-60" />
                              </Button>
                            </div>
                          ) : null}
                        </Fragment>
                      );
                    })}
                    <div className="col-span-3">
                      <Button
                        type="button"
                        onClick={() => {
                          const lastValue = last(values.stops);
                          arrayHelpers.push({
                            input: (lastValue?.input || 0) + 1,
                            output: "#0fffff",
                          });
                        }}
                      >
                        <PlusIcon /> Add stop
                      </Button>
                    </div>
                  </div>
                )}
              </FieldArray>
              <ErrorMessage name={`stops`} component={InlineError} />
              <label className="block space-y-1">
                <InterpolateOption />
              </label>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
}

function CategoryWizard() {
  const rep = usePersistence();
  const { featureMap } = useAtomValue(dataAtom);
  const options = useViablePropertiesForCategorical(featureMap);
  const [meta, setMeta] = rep.useMetadata();
  const [regenerate, setRegenerate] = useAtom(regenerateAtom);
  const [formError, setFormError] = useState<string | null>(null);

  return regenerate ? (
    <Formik<CategoricalValues>
      onSubmit={async (values) => {
        const ramp = COLORBREWER_ALL.find(
          (ramp) => ramp.name === values.rampName
        )!;
        const dataValues = Array.from(options.get(values.property) || []);

        const colors = ramp.colors[DEFAULT_CLASSES];

        const newSymbolization: ISymbolizationCategorical = {
          type: "categorical",
          simplestyle: values.simplestyle,
          defaultColor: values.defaultColor,
          defaultOpacity: values.defaultOpacity,
          property: values.property,
          stops: dataValues.slice(0, colors.length).map((input, i) => {
            return {
              input,
              output: colors[i],
            };
          }),
        };

        await Promise.resolve(
          setMeta({ symbolization: newSymbolization })
        ).catch(() => {
          toast.error("Failed to generate ramp");
        });

        setRegenerate(false);
      }}
      initialValues={{
        property:
          meta.symbolization?.type === "categorical"
            ? meta.symbolization.property
            : "",
        defaultColor: purple900,
        defaultOpacity:
          meta.symbolization?.type === "categorical"
            ? meta.symbolization.defaultOpacity
            : 0.3,
        rampName: COLORBREWER_QUAL[0].name,
        simplestyle:
          meta.symbolization?.type === "categorical"
            ? meta.symbolization.simplestyle
            : true,
      }}
    >
      <Form>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <label className="block">
              <div>
                <StyledLabelSpan>Input property</StyledLabelSpan>
              </div>
              <Field
                as="select"
                name="property"
                required
                className={styledSelect({ size: "sm" }) + " w-full"}
              >
                <option value={""}>Select…</option>
                {Array.from(options.keys(), (cat) => {
                  return (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  );
                })}
              </Field>
            </label>
            <div>
              <StyledLabelSpan>Colors</StyledLabelSpan>
              <Field name="rampName">
                {(fieldProps: FieldProps<string>) => {
                  const { field } = fieldProps;
                  return (
                    <P.Root>
                      <StyledPopoverTrigger>
                        <RampPreview
                          name={field.value}
                          classes={DEFAULT_CLASSES}
                          interpolate="step"
                        />
                        <CaretDownIcon className="w-5 h-5 flex-shrink-0" />
                      </StyledPopoverTrigger>
                      <PopoverContent2>
                        <StyledPopoverArrow />
                        <div className="space-y-2">
                          <div>
                            <RampChoices
                              label="Qualitative (Colorbrewer)"
                              colors={COLORBREWER_QUAL}
                              fieldProps={fieldProps}
                            />
                          </div>
                          <div>
                            <RampChoices
                              label="Qualitative (CARTO Colors)"
                              colors={CARTO_COLOR_QUALITATIVE}
                              fieldProps={fieldProps}
                            />
                          </div>
                          <DoneButton />
                        </div>
                      </PopoverContent2>
                    </P.Root>
                  );
                }}
              </Field>
            </div>
          </div>
          <div className="relative pt-2">
            <Button type="submit" variant="primary">
              Generate
            </Button>
          </div>
        </div>
      </Form>
    </Formik>
  ) : (
    <div>
      <Formik<ISymbolizationCategorical>
        onSubmit={async (values) => {
          try {
            Symbolization.parse(values);
          } catch (e) {
            setFormError((e as Error).message);
            return;
          }
          setFormError(null);
          try {
            await Promise.resolve(
              setMeta({
                symbolization: values,
              })
            ).catch(() => {
              toast.error("Failed to generate ramp");
            });
          } catch (e) {
            Sentry.captureException(e);
          }
        }}
        initialValues={meta.symbolization as ISymbolizationCategorical}
      >
        {({ values }) => {
          return (
            <Form className="space-y-4">
              {formError && <InlineError>{formError}</InlineError>}
              <SimpleStyleOption />
              <FieldArray name="stops">
                {(arrayHelpers: ArrayHelpers) => (
                  <div
                    className="w-full grid gap-2 items-center dark:text-white"
                    style={{
                      gridTemplateColumns: "1fr 1fr min-content",
                    }}
                  >
                    <div className="text-left font-normal">Value</div>
                    <div className="text-left font-normal col-span-2">
                      Output
                    </div>
                    {values.stops.map((_stop, i) => {
                      return (
                        <Fragment key={i}>
                          <div>
                            <Field
                              name={`stops.${i}.input`}
                              className={inputClass({
                                _size: "sm",
                              })}
                            />
                          </div>
                          <div>
                            <Field
                              component={ColorPopoverField}
                              name={`stops.${i}.output`}
                              _size="sm"
                              className={inputClass({
                                _size: "sm",
                              })}
                            />
                          </div>
                          {values.stops.length > 1 ? (
                            <div>
                              <Button
                                variant="quiet"
                                aria-label="Delete stop"
                                onClick={() => {
                                  arrayHelpers.remove(i);
                                }}
                              >
                                <TrashIcon className="opacity-60" />
                              </Button>
                            </div>
                          ) : null}
                        </Fragment>
                      );
                    })}
                    <div className="col-span-3">
                      <Button
                        type="button"
                        onClick={() => {
                          arrayHelpers.push({
                            input: "",
                            output: "#0fffff",
                          });
                        }}
                      >
                        <PlusIcon /> Add stop
                      </Button>
                    </div>
                  </div>
                )}
              </FieldArray>
              <ErrorMessage name={`stops`} component={InlineError} />
            </Form>
          );
        }}
      </Formik>
    </div>
  );
}

export function NoneSymbolization() {
  const rep = usePersistence();
  const [meta, setMeta] = rep.useMetadata();

  return (
    <div>
      <Formik<ISymbolizationNone>
        onSubmit={async (values) => {
          try {
            await Promise.resolve(
              setMeta({
                symbolization: values,
              })
            ).catch((e) => {
              toast.error("Failed to generate");
              Sentry.captureException(e);
            });
          } catch (e) {
            Sentry.captureException(e);
          }
        }}
        initialValues={{
          type: "none",
          simplestyle: meta.symbolization.simplestyle || true,
          defaultColor: purple900,
          defaultOpacity: meta.symbolization.defaultOpacity,
        }}
      >
        <Form>
          <div className="space-y-4">
            <TextWell>Uniform style for all features on the map.</TextWell>
            <SimpleStyleOption />
          </div>
        </Form>
      </Formik>
    </div>
  );
}

function ExportOption({ option }: { option: EOption }) {
  return (
    <Accordion.Item
      value={option.name}
      className="data-state-open:ring-1 ring-purple-300 data-state-open:rounded"
    >
      <Accordion.Header>
        <Accordion.Trigger
          className="w-full block text-sm p-2 flex items-center gap-x-2
        bg-gray-100 dark:bg-gray-900
        dark:text-white
        data-state-open:rounded-t
        data-state-open:bg-gray-200 dark:data-state-open:bg-black"
        >
          <CaretDownIcon className="transform data-state-open:rotate-90" />
          {option.name}
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content>
        <div className="p-2 space-y-2">
          <textarea
            rows={10}
            value={option.value}
            className={styledTextarea}
          ></textarea>
          <Button
            onClick={() => {
              void toast.promise(writeToClipboard(option.value), {
                loading: "Copying…",
                success: "Copied",
                error: "Failed to copy. Try again?",
              });
            }}
            size="sm"
          >
            <CopyIcon /> Copy
          </Button>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  );
}

function ExportSymbolization() {
  const rep = usePersistence();
  const [meta] = rep.useMetadata();
  const options = exportStyle(meta.symbolization);

  return (
    <Accordion.Root type="single" className="space-y-2">
      {options.map((option, i) => {
        return <ExportOption key={i} option={option} />;
      })}
    </Accordion.Root>
  );
}

export function SymbolizationEditor() {
  const rep = usePersistence();
  const [meta, setMeta] = rep.useMetadata();
  const [regenerate, setRegenerate] = useAtom(regenerateAtom);
  const [symbolizationType, setSymbolizationType] = useState<
    ISymbolization["type"]
  >(meta.symbolization?.type || "none");

  return (
    <div className="flex-auto overflow-y-auto placemark-scrollbar">
      <div className="divide-y divide-gray-200 dark:divide-gray-900 border-gray-200 dark:border-gray-900">
        <div className="p-3 space-y-2">
          <div className="text-sm font-bold dark:text-white">Symbolization</div>
          <TextWell>
            Control the style of features either directly with literal styles,
            or by using data-driven styles.
          </TextWell>
        </div>
        <PanelDetails title="Type">
          <div className="flex items-center gap-x-2">
            <select
              className={styledSelect({ size: "sm" })}
              value={symbolizationType}
              onChange={async (e) => {
                const type = e.target.value;
                if (!type) return;
                setSymbolizationType(type as ISymbolization["type"]);
                if (type === "none") {
                  await toast.promise(
                    Promise.resolve(
                      setMeta({
                        symbolization: {
                          type,
                          defaultOpacity: 0.3,
                          simplestyle: true,
                          defaultColor: purple900,
                        },
                      })
                    ),
                    {
                      loading: "Generating style…",
                      success: "Generated",
                      error: "Failed to generate style",
                    }
                  );
                } else {
                  setRegenerate(true);
                }
              }}
            >
              <option value="none">Uniform</option>
              <optgroup label="Data-driven">
                <option value="ramp">Ramp</option>
                <option value="categorical">Category</option>
              </optgroup>
            </select>
            <div className="flex-auto" />
          </div>
        </PanelDetails>
        <PanelDetails
          title="Configuration"
          accessory={
            symbolizationType !== "none" && regenerate === false ? (
              <Button
                size="xs"
                onClick={() => {
                  setRegenerate(true);
                }}
              >
                <ResetIcon />
                Regenerate
              </Button>
            ) : null
          }
        >
          <div className="text-sm">
            {match(symbolizationType)
              .with("none", () => <NoneSymbolization />)
              .with("categorical", () => <CategoryWizard />)
              .with("ramp", () => <RampWizard />)
              .otherwise(() => null)}
          </div>
        </PanelDetails>
        <PanelDetailsCollapsible
          title="Export symbolization"
          atom={panelSymbolizationExportOpen}
        >
          <ExportSymbolization />
        </PanelDetailsCollapsible>
      </div>
    </div>
  );
}

export default SymbolizationEditor;
