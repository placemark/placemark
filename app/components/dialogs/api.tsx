import { useMutation, invalidateQuery } from "@blitzjs/rpc";
import { CodeIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { DialogHeader } from "app/components/dialog";
import { Close } from "@radix-ui/react-dialog";
import {
  Button,
  CopiableURL,
  Hint,
  StyledLabelSpan,
  StyledSwitch,
  StyledThumb,
  TextWell,
} from "app/components/elements";
import { getAPIURL, getShareURL } from "app/lib/api";
import { usePersistence } from "app/lib/persistence/context";
import editWrappedFeatureCollectionMutation from "app/wrappedFeatureCollections/mutations/editWrappedFeatureCollection";
import getWrappedFeatureCollection from "app/wrappedFeatureCollections/queries/getWrappedFeatureCollection";
import clsx from "clsx";

export function APIDialog() {
  const rep = usePersistence();
  const [editWrappedFeatureCollection] = useMutation(
    editWrappedFeatureCollectionMutation
  );

  const header = <DialogHeader title="Sharing" titleIcon={CodeIcon} />;
  const [meta] = rep.useMetadata();
  if (meta.type === "memory") {
    return (
      <>
        {header}
        <TextWell>This map is a draft and can't be shared.</TextWell>
        <Close asChild>
          <Button>Done</Button>
        </Close>
      </>
    );
  }
  return (
    <>
      {header}
      <div className="space-y-4">
        <label className="flex items-center gap-x-2">
          <StyledSwitch
            id="public"
            checked={meta.access === "PUBLIC"}
            onCheckedChange={async (val) => {
              await editWrappedFeatureCollection({
                id: meta.id,
                access: val ? "PUBLIC" : "PRIVATE",
              });
              await invalidateQuery(getWrappedFeatureCollection, {
                id: meta.id,
              });
            }}
          >
            <StyledThumb />
          </StyledSwitch>
          Public sharing
        </label>
        <div
          className={clsx(
            "relative space-y-2",
            meta.access === "PUBLIC"
              ? ""
              : "pointer-events-none cursor-not-allowed blur-sm transition-all"
          )}
        >
          <label className="block">
            <StyledLabelSpan>
              API Endpoint
              <span className="inline-block w-2" />
              <Hint>This map as a GeoJSON FeatureCollection.</Hint>
            </StyledLabelSpan>
            <CopiableURL url={getAPIURL(meta)} />
          </label>

          <label className="block">
            <StyledLabelSpan>
              Preview URL
              <span className="inline-block w-2" />
              <Hint>This map as a shareable link.</Hint>
            </StyledLabelSpan>
            <CopiableURL url={getShareURL(meta)} />
          </label>

          <div className="pt-2">
            <TextWell>
              Individual features are also accessible through the API: refer to
              the{" "}
              <a
                href="https://www.placemark.io/documentation/placemark-rest-api"
                rel="noreferrer"
                target="_blank"
              >
                API documentation
              </a>
              , or copy the endpoint in the ID panel.
            </TextWell>
          </div>
        </div>
        <div>
          <a
            className="inline-flex gap-x-1 items-center text-sm hover:underline text-purple-700 dark:text-purple-300"
            href="https://www.placemark.io/documentation/placemark-rest-api"
            target="_blank"
            rel="noreferrer"
          >
            <InfoCircledIcon />
            API Documentation
          </a>
        </div>
      </div>
    </>
  );
}
