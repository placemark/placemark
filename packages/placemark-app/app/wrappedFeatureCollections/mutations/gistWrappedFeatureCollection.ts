import { resolver } from "@blitzjs/rpc";
import db from "db";
import { GistWrappedFeatureCollection } from "app/wrappedFeatureCollections/validations";
import { NotFoundError } from "blitz";
import { Octokit } from "@octokit/core";
import { wrappedFeaturesToFeatureCollection } from "app/lib/convert/local/geojson";
import { IWrappedFeature } from "types";
import { getWrappedFeatureCollection } from "app/lib/utils_server";

/**
 * Given a persisted map, save it as Gist.
 * Throws an error if the user doesn't have a connection
 * to GitHub.
 */
export default resolver.pipe(
  resolver.zod(GistWrappedFeatureCollection),
  resolver.authorize(),
  async ({ id, saveAs }, ctx) => {
    const user = await db.user.findFirstOrThrow({
      where: { id: ctx.session.userId },
    });

    if (!user.githubToken) {
      throw new NotFoundError("No GitHub Token");
    }

    const octokit = new Octokit({
      auth: user.githubToken,
    });

    const [wfc, wrappedFeatures] = await Promise.all([
      getWrappedFeatureCollection(id, ctx),
      db.wrappedFeature.findMany({
        select: {
          feature: true,
          at: true,
          id: true,
          folderId: true,
        },
        where: {
          wrappedFeatureCollectionId: id,
          deleted: false,
        },
      }),
    ]);

    const files = {
      "map.geojson": {
        content: JSON.stringify(
          wrappedFeaturesToFeatureCollection(
            wrappedFeatures as unknown as IWrappedFeature[],
            {
              winding: "RFC7946",
              truncate: true,
              addBboxes: false,
              indent: false,
              includeId: true,
            }
          ),
          null,
          4
        ),
      },
    };

    const response =
      wfc.gistId && !saveAs
        ? await octokit.request("PATCH /gists/{gist_id}", {
            gist_id: wfc.gistId,
            description: wfc.name,
            public: false,
            files,
          })
        : await octokit.request("POST /gists", {
            description: wfc.name,
            public: false,
            files,
          });

    const url = response.data.html_url;
    const gistId = response.data.id;

    if (!url) {
      throw new Error("Gist could not be created");
    }

    await db.wrappedFeatureCollection.update({
      data: {
        gistId,
      },
      where: {
        id,
      },
    });

    return url;
  }
);
