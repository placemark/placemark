import { PlayIcon } from "@radix-ui/react-icons";
import { DialogHeader } from "app/components/dialog";
import { Button, styledInlineA } from "app/components/elements";

export function PlayDialog({ onClose }: { onClose: () => void }) {
  return (
    <>
      <DialogHeader title="Play" titleIcon={PlayIcon} />
      <div className="space-y-4 opacity-80 text-lg">
        This is a free map editing environment. It's a part of{" "}
        <a
          target="_blank"
          rel="noreferrer"
          href="https://placemark.io/"
          className={styledInlineA}
        >
          Placemark
        </a>
        , an editor for maps. This editor will only keep data around for as long
        as the tab is open. To save maps and work with your team, try out
        Placemark!
      </div>
      <div className="pt-4">
        <Button
          size="md"
          variant="primary"
          onClick={() => {
            onClose();
          }}
        >
          Ok!
        </Button>
      </div>
    </>
  );
}
