import { ConvertResult, toDom, stringToBlob } from "./utils";
import readAsText from "app/lib/read_as_text";
import type { FeatureCollection, FeatureMap, FolderMap } from "types";
import type { ExportOptions, ExportResult, FileType, ImportOptions } from ".";
import { EitherAsync } from "purify-ts/EitherAsync";
import { ConvertError } from "app/lib/errors";
import { solveRootItems } from "app/components/panels/feature_editor/feature_editor_folder/math";

export class CKML implements FileType {
  id = "kml" as const;
  label = "KML";
  extensions = [".kml"];
  filenames = [] as string[];
  mimes = ["application/vnd.google-earth.kml+xml"];
  forwardBinary(file: ArrayBuffer, _options: ImportOptions) {
    return readAsText(file).chain((text) => {
      return KML.forwardString(text);
    });
  }
  forwardString(text: string) {
    return EitherAsync<ConvertError, ConvertResult>(
      async function forwardKML() {
        const toGeoJSON = await import("@tmcw/togeojson");
        const dom = await toDom(text);
        const root = toGeoJSON.kmlWithFolders(dom);
        return {
          type: "root",
          notes: [],
          root,
        };
      }
    );
  }
  back(
    {
      geojson: _ignore,
      featureMap,
      folderMap,
    }: {
      geojson: FeatureCollection;
      featureMap: FeatureMap;
      folderMap: FolderMap;
    },
    _options: ExportOptions
  ) {
    return EitherAsync<ConvertError, ExportResult>(async ({ throwE }) => {
      const { foldersToKML } = await import("@placemarkio/tokml");
      try {
        const root = solveRootItems(featureMap, folderMap);
        return {
          blob: stringToBlob(foldersToKML(root)),
          name: "features.kml",
        };
      } catch (e) {
        return throwE(new ConvertError("Could not convert to KML"));
      }
    });
  }
}

export const KML = new CKML();
