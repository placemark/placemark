import { getAntiCSRFToken } from "@blitzjs/auth";
import type { Pusher, Puller, HTTPRequestInfo } from "replicache";
// import once from "lodash/once";

async function httpRequest(
  request: Request
): Promise<{ httpRequestInfo: HTTPRequestInfo; response: Response }> {
  request.headers.set("anti-csrf", getAntiCSRFToken() as string);
  const response = await fetch(request);
  const httpStatusCode = response.status;
  const errorMessage = httpStatusCode === 200 ? "" : await response.text();
  return {
    response,
    httpRequestInfo: {
      httpStatusCode,
      errorMessage,
    },
  };
}

// Modified from https://git.io/JumOp
export const blitzPusher: Pusher = async (request) => {
  return (await httpRequest(request)).httpRequestInfo;
};

export const blitzPuller: Puller = async (request) => {
  const { httpRequestInfo, response } = await httpRequest(request);
  if (httpRequestInfo.httpStatusCode !== 200) {
    return {
      httpRequestInfo,
    };
  }
  return {
    response: await response.json(),
    httpRequestInfo,
  };
};
