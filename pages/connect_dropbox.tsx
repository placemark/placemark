import { Button } from "app/components/elements";
import { useDropbox } from "app/hooks/use_dropbox";
import { env } from "app/lib/env_client";
import { DropboxAuth } from "dropbox";
import { useEffect, useState } from "react";
import { useSearchParams } from "wouter";

const DROPBOX_APP_KEY = env.DROPBOX_APP_KEY;
const dbxAuth = new DropboxAuth({ clientId: DROPBOX_APP_KEY });

/**
 * To avoid losing state while connecting Dropbox, this is meant to work
 * in a pop-up window.
 */
export function ConnectDropbox() {
  const [state, setState] = useState<"initial" | "loading" | "done">("initial");
  const dropbox = useDropbox();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setState("loading");
      dbxAuth.setCodeVerifier(window.sessionStorage.getItem("codeVerifier")!);
      dbxAuth
        .getAccessTokenFromCode(
          window.sessionStorage.getItem("redirectUri")!,
          code,
        )
        .then((response) => {
          setState("done");
          localStorage.setItem(
            "dropbox_access_token",
            (response.result as any).access_token,
          );
          setTimeout(() => {
            window.close();
          }, 2_000);
        })
        .then((response) => {
          console.log(response);
        })
        .catch((error) => {
          console.error(error.error || error);
        });
    }
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {state === "initial" ? (
        <Button
          size="lg"
          variant="primary"
          type="button"
          onClick={() => {
            dropbox.authenticate();
          }}
        >
          Connect Dropbox
        </Button>
      ) : state === "loading" ? (
        "Loading..."
      ) : (
        "Done, closing"
      )}
    </div>
  );
}
