import { Button, styledCheckbox } from "./elements";
import { GroupIcon, PlusIcon } from "@radix-ui/react-icons";
import {
  getQItemNamePreview,
  qItemToFeature,
  qItemToPolygon,
} from "app/lib/geocode";
import { USelection } from "state";
import { newFeatureId } from "app/lib/id";
import * as Sentry from "@sentry/nextjs";
import { match } from "ts-pattern";
import { useAtom } from "jotai";
import { usePersistence } from "app/lib/persistence/context";
import {
  addMetadataWithGeocoderAtom,
  lastSearchResultAtom,
  selectionAtom,
} from "state/jotai";
import { Feature } from "types";

export function LastSearchResult() {
  const [addMetadataWithGeocoder, setAddMetadataWithGeocoder] = useAtom(
    addMetadataWithGeocoderAtom
  );
  const rep = usePersistence();
  const transact = rep.useTransact();
  const [lastSearchResult, setLastSearchResult] = useAtom(lastSearchResultAtom);
  const [selection, setSelection] = useAtom(selectionAtom);

  if (!lastSearchResult) {
    return null;
  }

  const onAddPoint: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    const id = newFeatureId();
    transact({
      note: "Added a geocoded point",
      track: "add-geocoded-point",
      putFeatures: [
        {
          id,
          folderId: USelection.folderId(selection),
          feature: qItemToFeature(lastSearchResult, addMetadataWithGeocoder),
        },
      ],
    })
      .then(() => {
        setSelection(USelection.single(id));
      })
      .catch((e) => Sentry.captureException(e));
    setLastSearchResult(null);
    e.stopPropagation();
  };

  const asPolygon =
    lastSearchResult &&
    qItemToPolygon(lastSearchResult, addMetadataWithGeocoder);

  function onAddPolygon(asPolygon: Feature) {
    const id = newFeatureId();
    transact({
      note: "Added a geocoded extent",
      putFeatures: [
        {
          id,
          folderId: USelection.folderId(selection),
          feature: asPolygon,
        },
      ],
    })
      .then(() => {
        setSelection(USelection.single(id));
      })
      .catch((e) => Sentry.captureException(e));
    setLastSearchResult(null);
  }

  return (
    <div
      className="absolute inset-0 bg-opacity-50 p-4 flex justify-end items-start"
      onClick={() => {
        setLastSearchResult(null);
      }}
    >
      <div className="bg-white p-2 rounded-md space-y-1">
        <div className="flex items-stretch gap-x-1">
          {match(lastSearchResult)
            .with({ type: "extent" }, (lastSearchResult) => {
              return asPolygon ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={(e) => {
                    onAddPolygon(asPolygon);
                    e.stopPropagation();
                  }}
                >
                  <GroupIcon />
                  Add {getQItemNamePreview(lastSearchResult)}
                </Button>
              ) : null;
            })
            .with({ type: "coordinate" }, (lastSearchResult) => {
              return (
                <Button type="button" variant="primary" onClick={onAddPoint}>
                  <PlusIcon />
                  Add {getQItemNamePreview(lastSearchResult)}
                </Button>
              );
            })
            .with({ type: "Feature" }, (lastSearchResult) => {
              return (
                <>
                  <Button type="button" variant="primary" onClick={onAddPoint}>
                    <PlusIcon />
                    Add {getQItemNamePreview(lastSearchResult)}
                  </Button>
                  {asPolygon ? (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddPolygon(asPolygon);
                      }}
                    >
                      <GroupIcon />
                      Extent
                    </Button>
                  ) : null}
                </>
              );
            })
            .exhaustive()}
        </div>
        <label
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="flex items-center justify-end gap-x-1 text-sm opacity-50 hover:opacity-100"
        >
          <input
            type="checkbox"
            checked={addMetadataWithGeocoder}
            className={styledCheckbox({ variant: "default" })}
            onChange={(e) => {
              setAddMetadataWithGeocoder(e.target.checked);
            }}
          />
          <span>Include data</span>
        </label>
      </div>
    </div>
  );
}
