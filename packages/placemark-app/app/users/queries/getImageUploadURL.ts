import { resolver } from "@blitzjs/rpc";
import { env } from "app/lib/env_server";
import { z } from "zod";

const ImagesResponse = z
  .object({
    result: z
      .object({
        id: z.string(),
        uploadURL: z.string(),
      })
      .passthrough(),
  })
  .passthrough();

export default resolver.pipe(
  resolver.authorize(),
  async function getImageUploadURL(_ = null) {
    if (env.CLOUDFLARE_API_TOKEN === "off") {
      return null;
    }
    // https://developers.cloudflare.com/images/cloudflare-images/upload-images/direct-creator-upload/
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_IMAGES_ACCOUNT_ID}/images/v2/direct_upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        },
      }
    );

    const body = await res.json();

    return ImagesResponse.parse(body);
  }
);
