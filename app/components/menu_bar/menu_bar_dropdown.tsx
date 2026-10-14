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
import { CLOUD_PROVIDERS } from "app/lib/cloud_providers";
import type { CloudProvider } from "app/lib/cloud_providers/types";
import { usePersistence } from "app/lib/persistence/context";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { DropdownMenu as DD } from "radix-ui";
import { dialogAtom, momentLogAtom, themeAtom } from "state/jotai";

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

function ThemeSwitcher() {
  const [theme, setTheme] = useAtom(themeAtom);

  return (
    <StyledItem
      onSelect={() => {
        setTheme((theme) => (theme === "light" ? "dark" : "light"));
      }}
    >
      Switch to {theme === "light" ? "dark" : "light"} theme
    </StyledItem>
  );
}

function CloudMenuItems({ provider }: { provider: CloudProvider }) {
  const setDialogState = useSetAtom(dialogAtom);
  const authState = provider.useAuthState();

  return (
    <>
      <DDSeparator />
      <DDLabel>{provider.label}</DDLabel>
      {authState.status === "signed-out" ? (
        <StyledItem
          onSelect={() => {
            setDialogState({ type: "cloud_sign_in" });
          }}
        >
          Sign in with {provider.label}
        </StyledItem>
      ) : (
        <StyledItem
          onSelect={() => {
            setDialogState({ type: "cloud_maps" });
          }}
        >
          My maps…
        </StyledItem>
      )}
    </>
  );
}

function CloudMenu() {
  const provider = CLOUD_PROVIDERS[0];
  if (!provider) return null;
  return <CloudMenuItems provider={provider} />;
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

            <ThemeSwitcher />

            <DDSeparator />
            <DD.Sub>
              <DDSubTriggerItem>
                Undo history
                <div className="flex-auto" />
                <CaretRightIcon />
              </DDSubTriggerItem>
              <UndoList />
            </DD.Sub>
            <CloudMenu />
          </DDContent>
        </DD.Portal>
      </DD.Root>
    </div>
  );
}
