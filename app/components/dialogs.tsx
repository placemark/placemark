import dynamic from "next/dynamic";
import { memo, Suspense, useCallback } from "react";
import { useAtom } from "jotai";
import { dialogAtom } from "state/jotai";
import { match } from "ts-pattern";
import * as D from "@radix-ui/react-dialog";
import {
  B3Size,
  StyledDialogOverlay,
  StyledDialogContent,
  Loading,
  DefaultErrorBoundary,
} from "./elements";
import * as dialogState from "state/dialog_state";

const CircleDialog = dynamic<{
  modal: dialogState.DialogStateCircle;
  onClose: () => void;
}>(() => import("app/components/dialogs/circle").then((r) => r.CircleDialog), {
  loading: () => <Loading />,
});

const ExportSVGDialog = dynamic<{
  modal: dialogState.DialogStateExportSVG;
  onClose: () => void;
}>(
  () =>
    import("app/components/dialogs/export_svg").then((r) => r.ExportSVGDialog),
  {
    loading: () => <Loading />,
  }
);

const ImportDialog = dynamic<{
  modal: dialogState.DialogStateImport;
  onClose: () => void;
}>(() => import("app/components/dialogs/import").then((r) => r.ImportDialog), {
  loading: () => <Loading />,
});

const ExportDialog = dynamic<{
  onClose: () => void;
}>(() => import("app/components/dialogs/export").then((r) => r.ExportDialog), {
  loading: () => <Loading />,
});

const ImportURLDialog = dynamic<{
  onClose: () => void;
}>(
  () =>
    import("app/components/dialogs/import_url").then((r) => r.ImportURLDialog),
  {
    loading: () => <Loading />,
  }
);

const ImportExampleDialog = dynamic<{
  onClose: () => void;
}>(
  () =>
    import("app/components/dialogs/import_example").then(
      (r) => r.ImportExampleDialog
    ),
  {
    loading: () => <Loading />,
  }
);

const ImportTextDialog = dynamic<{
  onClose: () => void;
  modal: dialogState.DialogStateLoadText;
}>(
  () =>
    import("app/components/dialogs/import_text").then(
      (r) => r.ImportTextDialog
    ),
  {
    loading: () => <Loading />,
  }
);

const CircleTypesDialog = dynamic<Record<string, never>>(
  () =>
    import("app/components/dialogs/circle_types").then(
      (r) => r.CircleTypesDialog
    ),
  {
    loading: () => <Loading />,
  }
);

const CheatsheetDialog = dynamic<Record<string, never>>(
  () =>
    import("app/components/dialogs/cheatsheet").then((r) => r.CheatsheetDialog),
  {
    loading: () => <Loading />,
  }
);

const QuickswitcherDialog = dynamic<{
  onClose: () => void;
}>(
  () =>
    import("app/components/dialogs/quickswitcher").then(
      (r) => r.QuickswitcherDialog
    ),
  {
    loading: () => <Loading />,
  }
);

const CastPropertyDialog = dynamic<{
  onClose: () => void;
  modal: dialogState.DialogStateCastProperty;
}>(
  () =>
    import("app/components/dialogs/cast_property").then(
      (r) => r.CastPropertyDialog
    ),
  {
    loading: () => <Loading />,
  }
);

const ExportCodeDialog = dynamic<{
  onClose: () => void;
}>(
  () =>
    import("app/components/dialogs/export_code").then(
      (r) => r.ExportCodeDialog
    ),
  {
    loading: () => <Loading />,
  }
);

const ImportNotesDialog = dynamic<{
  onClose: () => void;
  modal: dialogState.DialogStateImportNotes;
}>(
  () =>
    import("app/components/dialogs/import_notes").then(
      (r) => r.ImportNotesDialog
    ),
  {
    loading: () => <Loading />,
  }
);

const Simplify = dynamic<{
  onClose: () => void;
  modal: dialogState.DialogStateSimplify;
}>(() => import("app/components/dialogs/simplify"), {
  loading: () => <Loading />,
});

const BufferDialog = dynamic<{
  onClose: () => void;
  modal: dialogState.DialogStateBuffer;
}>(() => import("app/components/dialogs/buffer"), {
  loading: () => <Loading />,
});

export const Dialogs = memo(function Dialogs() {
  const [dialog, setDialogState] = useAtom(dialogAtom);

  const onClose = useCallback(() => {
    setDialogState(null);
  }, [setDialogState]);

  let dialogSize: B3Size = "sm";

  const content = match(dialog)
    .with(null, () => null)
    .with({ type: "import" }, (modal) => (
      <ImportDialog modal={modal} onClose={onClose} />
    ))
    .with({ type: "import_notes" }, (modal) => (
      <ImportNotesDialog modal={modal} onClose={onClose} />
    ))
    .with({ type: "export" }, () => <ExportDialog onClose={onClose} />)
    .with({ type: "quickswitcher" }, () => {
      dialogSize = "xs";
      return <QuickswitcherDialog onClose={onClose} />;
    })
    .with({ type: "export_code" }, () => <ExportCodeDialog onClose={onClose} />)
    .with({ type: "load_text" }, (modal) => (
      <ImportTextDialog modal={modal} onClose={onClose} />
    ))
    .with({ type: "cast_property" }, (modal) => (
      <CastPropertyDialog modal={modal} onClose={onClose} />
    ))
    .with({ type: "cheatsheet" }, () => <CheatsheetDialog />)
    .with({ type: "circle_types" }, () => <CircleTypesDialog />)
    .with({ type: "circle" }, (modal) => (
      <CircleDialog modal={modal} onClose={onClose} />
    ))
    .with({ type: "simplify" }, (modal) => (
      <Simplify onClose={onClose} modal={modal} />
    ))
    .with({ type: "buffer" }, (modal) => (
      <BufferDialog onClose={onClose} modal={modal} />
    ))
    .with({ type: "export-svg" }, (modal) => (
      <ExportSVGDialog onClose={onClose} modal={modal} />
    ))
    .with({ type: "from_url" }, () => <ImportURLDialog onClose={onClose} />)
    .with({ type: "import_example" }, () => (
      <ImportExampleDialog onClose={onClose} />
    ))
    .exhaustive();

  return (
    <D.Root
      open={!!content}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      {/** Weird as hell shit here. Without this trigger, radix will
      return focus to the body element, which will not receive events. */}
      <D.Trigger className="hidden">
        <div className="hidden"></div>
      </D.Trigger>
      <D.Portal>
        {dialog?.type !== "circle" ? <StyledDialogOverlay /> : null}
        <Suspense fallback={<Loading />}>
          <StyledDialogContent
            onOpenAutoFocus={(e) => e.preventDefault()}
            size={dialogSize}
          >
            <DefaultErrorBoundary>{content}</DefaultErrorBoundary>
          </StyledDialogContent>
        </Suspense>
      </D.Portal>
    </D.Root>
  );
});
