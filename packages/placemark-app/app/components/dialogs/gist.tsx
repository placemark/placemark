import { useEffect } from "react";
import { useQuery } from "@blitzjs/rpc";
import * as Sentry from "@sentry/nextjs";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { DialogHeader } from "app/components/dialog";
import { usePersistence } from "app/lib/persistence/context";
import { Button, TextWell } from "../elements";
import getGitHubStatus from "app/users/queries/getGitHubStatus";
import { useGist } from "app/hooks/use_gist";
import { env } from "app/lib/env_client";

export function GistDialog({ onClose }: { onClose: () => void }) {
  const [githubStatus] = useQuery(getGitHubStatus, {});
  const rep = usePersistence();
  const [meta] = rep.useMetadata();
  const shareGist = useGist();

  useEffect(() => {
    if (!githubStatus) return;
    shareGist()
      .then(() => {
        onClose();
      })
      .catch((e) => {
        Sentry.captureException(e);
      });
  }, [githubStatus, shareGist, onClose]);

  if (meta.type !== "persisted") {
    return null;
  }

  if (githubStatus) {
    return (
      <>
        <DialogHeader title="Connect GitHub" titleIcon={GitHubLogoIcon} />
        <TextWell size="md">Sharing Gist…</TextWell>
      </>
    );
  }

  return (
    <>
      <DialogHeader title="Connect GitHub" titleIcon={GitHubLogoIcon} />
      <TextWell size="md">
        To share maps with GitHub Gist, you’ll need to connect your GitHub
        account to your Placemark account.
      </TextWell>
      <div className="pt-4">
        <Button
          onClick={() => {
            window.open(
              `${env.NEXT_PUBLIC_DOMAIN_WITH_SLASH}api/github/oauth/login`,
              "height=500,width=500,left=100,top=100,resizable=yes,scrollbars=yes,toolbar=yes,menubar=no,location=no,directories=no, status=yes"
            );
          }}
        >
          Connect GitHub
        </Button>
      </div>
    </>
  );
}
