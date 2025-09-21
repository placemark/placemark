import { ArrowRightIcon, CaretRightIcon } from "@radix-ui/react-icons";
import {
  DDContent,
  DDLabel,
  DDSeparator,
  DDSubContent,
  DDSubTriggerItem,
  StyledItem,
  styledButton,
} from "app/components/elements";
import { useOpenFiles } from "app/hooks/use_open_files";
import { usePersistence } from "app/lib/persistence/context";
import { useAtomValue, useSetAtom } from "jotai";
import { DropdownMenu as DD } from "radix-ui";
import { dialogAtom, momentLogAtom } from "state/jotai";

function UndoList() {
  const rep = usePersistence();
  const historyControl = rep.useHistoryControl();
  const momentLog = useAtomValue(momentLogAtom);
  return (
    <DDSubContent>
      {momentLog.undo
        .map((moment, i) => {
          return (
            <StyledItem
              key={i}
              onSelect={async (_e) => {
                for (let j = 0; j < i + 1; j++) {
                  await historyControl("undo");
                }
              }}
            >
              <ArrowRightIcon className="opacity-0" />
              {moment.note || ""}
            </StyledItem>
          );
        })
        .reverse()}
      <DDLabel>
        <div className="flex items-center gap-x-2">
          <ArrowRightIcon />
          Current state
        </div>
      </DDLabel>
      {momentLog.redo.map((moment, i) => {
        return (
          <StyledItem
            key={i}
            onSelect={async (_e) => {
              for (let j = 0; j < i + 1; j++) {
                await historyControl("redo");
              }
            }}
          >
            <ArrowRightIcon className="opacity-0" />
            {moment.note || ""}
          </StyledItem>
        );
      })}
    </DDSubContent>
  );
}

export function MenuBarDropdown() {
  const openFiles = useOpenFiles();
  const setDialogState = useSetAtom(dialogAtom);

  return (
    <div className="flex items-center">
      <DD.Root>
        <DD.Trigger className={styledButton({ size: "sm", variant: "quiet" })}>
          <span>File</span>
        </DD.Trigger>
        <DD.Portal>
          <DDContent>
            <DD.Sub>
              <DDSubTriggerItem>
                Import
                <div className="flex-auto" />
                <CaretRightIcon />
              </DDSubTriggerItem>
              <DDSubContent>
                <StyledItem
                  onSelect={() => {
                    return openFiles();
                  }}
                >
                  Import file
                </StyledItem>
                <StyledItem
                  onSelect={() => {
                    setDialogState({
                      type: "load_text",
                    });
                  }}
                >
                  Paste text
                </StyledItem>
                <StyledItem
                  onSelect={() => {
                    setDialogState({
                      type: "from_url",
                    });
                  }}
                >
                  From URL
                </StyledItem>
                <StyledItem
                  onSelect={() => {
                    setDialogState({
                      type: "import_example",
                    });
                  }}
                >
                  Data library
                </StyledItem>
              </DDSubContent>
            </DD.Sub>
            <StyledItem
              onSelect={() => {
                setDialogState({ type: "export" });
              }}
            >
              Export
            </StyledItem>
            <StyledItem
              onSelect={() => {
                setDialogState({ type: "export-svg" });
              }}
            >
              Export SVG
            </StyledItem>

            <DDSeparator />
            <DD.Sub>
              <DDSubTriggerItem>
                Undo history
                <div className="flex-auto" />
                <CaretRightIcon />
              </DDSubTriggerItem>
              <UndoList />
            </DD.Sub>
          </DDContent>
        </DD.Portal>
      </DD.Root>
    </div>
  );
}
