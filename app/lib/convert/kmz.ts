import { ConvertResult, getExtension } from "./utils";
import readAsText from "app/lib/read_as_text";
import { ConvertError, PlacemarkError } from "app/lib/errors";
import type { FeatureCollection, FeatureMap, FolderMap } from "types";
import type { ExportOptions, ExportResult, FileType, ImportOptions } from ".";
import { EitherAsync } from "purify-ts/EitherAsync";
import { solveRootItems } from "app/components/panels/feature_editor/feature_editor_folder/math";
import { KML } from "app/lib/convert/kml";
import { unzip } from "./local/shared";

export class CKMZ implements FileType {
  id = "kmz" as const;
  label = "KMZ";
  extensions = [".kmz"];
  filenames = [] as string[];
  mimes = [] as string[];
  forwardBinary(file: ArrayBuffer, _options: ImportOptions) {
    return EitherAsync<PlacemarkError, ConvertResult>(
      async function forwardKmz({ throwE, liftEither }) {
        const unzipped = await unzip(file);
        const kmlFile = Object.entries(unzipped).find(([filename]) => {
          return getExtension(filename) === ".kml";
        });
        if (!kmlFile) {
          return throwE(new PlacemarkError("No KML file found within KMZ"));
        }
        const text = await liftEither(await readAsText(kmlFile[1]));
        return liftEither(await KML.forwardString(text));
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
        const fflate = await import("fflate");
        const str = foldersToKML(root);
        const encoded = new TextEncoder().encode(str);
        const zipResult = await new Promise<Uint8Array>((resolve, reject) => {
          fflate.zip(
            {
              "doc.kml": encoded,
            },
            (err, res) => {
              if (err) return reject(err);
              resolve(res);
            }
          );
        });
        return {
          blob: new Blob([zipResult], { type: "application/octet-stream" }),
          name: "features.kmz",
        };
      } catch (e) {
        return throwE(new ConvertError("Could not convert to KMZ"));
      }
    });
  }
}

export const KMZ = new CKMZ();
