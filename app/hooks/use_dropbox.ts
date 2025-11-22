import { env } from "app/lib/env_client";
import { Dropbox, DropboxAuth } from "dropbox";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

// You'll need to add your Dropbox App Key here or via environment variable
const DROPBOX_APP_KEY = env.DROPBOX_APP_KEY;
const dbxAuth = new DropboxAuth({ clientId: DROPBOX_APP_KEY });

interface DropboxUploadResult {
  url: string;
  path: string;
}

export function useDropbox() {
  const [authState, setAuthState] = useState<{
    isAuthenticated: boolean;
    error: string | null;
  }>({
    isAuthenticated: false,
    error: null,
  });

  useEffect(() => {
    // Check if we're returning from OAuth redirect
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");

      if (accessToken) {
        // Store token in localStorage for persistence
        localStorage.setItem("dropbox_access_token", accessToken);
        setAuthState({
          isAuthenticated: true,
          error: null,
        });

        // Clean up URL
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }
    } else {
      // Check for existing token in localStorage
      const storedToken = localStorage.getItem("dropbox_access_token");
      if (storedToken) {
        setAuthState({
          isAuthenticated: true,
          error: null,
        });
      }
    }
  }, []);

  const authenticate = useCallback(async () => {
    const redirectUri = window.location.origin + window.location.pathname;
    const authUrl = await dbxAuth.getAuthenticationUrl(
      redirectUri,
      undefined,
      "code",
      "offline",
      undefined,
      undefined,
      true,
    );

    window.sessionStorage.clear();
    window.sessionStorage.setItem("codeVerifier", dbxAuth.getCodeVerifier());
    window.sessionStorage.setItem("redirectUri", redirectUri);

    window.location.href = authUrl.toString();
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem("dropbox_access_token");
    setAuthState({
      isAuthenticated: false,
      error: null,
    });
  }, []);

  const uploadFile = useCallback(
    async (
      blob: Blob,
      filename: string,
    ): Promise<DropboxUploadResult | null> => {
      const accessToken = localStorage.getItem("dropbox_access_token");

      if (!accessToken) {
        toast.error("Access token not found: reauthenticate");
        return null;
      }

      const dbx = new Dropbox({ accessToken: accessToken });

      try {
        // Upload file to Dropbox
        const uploadResponse = await dbx.filesUpload({
          path: `/${filename}`,
          contents: blob,
          mode: { ".tag": "overwrite" },
        });

        const path =
          uploadResponse.result.path_display ||
          uploadResponse.result.path_lower;

        if (!path) return null;

        // Create a shared link for the file
        try {
          const sharedLinkResponse =
            await dbx.sharingCreateSharedLinkWithSettings({
              path: path,
              settings: {
                requested_visibility: { ".tag": "public" },
              },
            });

          return {
            url: sharedLinkResponse.result.url.replace("?dl=0", "?dl=1"),
            path: path,
          };
        } catch (linkError: any) {
          // If link already exists, try to get it
          if (
            linkError?.error?.error?.[".tag"] === "shared_link_already_exists"
          ) {
            const linksResponse = await dbx.sharingListSharedLinks({
              path:
                uploadResponse.result.path_display ||
                uploadResponse.result.path_lower,
            });

            if (linksResponse.result.links.length > 0) {
              return {
                url: linksResponse.result.links[0].url.replace(
                  "?dl=0",
                  "?dl=1",
                ),
                path: path,
              };
            }
          }
          throw linkError;
        }
      } catch (error: any) {
        if (error?.status === 401) {
          // Token expired or invalid
          disconnect();
          throw new Error("Dropbox authentication expired. Please reconnect.");
        }
        throw error;
      }
    },
    [disconnect],
  );

  return {
    isAuthenticated: authState.isAuthenticated,
    error: authState.error,
    authenticate,
    disconnect,
    uploadFile,
  };
}
