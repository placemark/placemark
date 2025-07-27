import { memo, Suspense, useCallback } from "react";
import { useAtom } from "jotai";
import { dialogAtom } from "state/jotai";
import { match } from "ts-pattern";
import { Dialog as D } from "radix-ui";
import {
	B3Size,
	StyledDialogOverlay,
	StyledDialogContent,
	DefaultErrorBoundary,
	Loading,
} from "./elements";
import { CircleDialog } from "app/components/dialogs/circle";
import { ExportSVGDialog } from "app/components/dialogs/export_svg";
import { ImportDialog } from "app/components/dialogs/import";
import { ExportDialog } from "app/components/dialogs/export";
import { ImportURLDialog } from "app/components/dialogs/import_url";
import { ImportExampleDialog } from "app/components/dialogs/import_example";
import { ImportTextDialog } from "app/components/dialogs/import_text";
import { CircleTypesDialog } from "app/components/dialogs/circle_types";
import { CheatsheetDialog } from "app/components/dialogs/cheatsheet";
import { QuickswitcherDialog } from "app/components/dialogs/quickswitcher";
import { CastPropertyDialog } from "app/components/dialogs/cast_property";
import { ExportCodeDialog } from "app/components/dialogs/export_code";
import { ImportNotesDialog } from "app/components/dialogs/import_notes";
import SimplifyDialog from "app/components/dialogs/simplify";
import BufferDialog from "app/components/dialogs/buffer";

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
			<SimplifyDialog onClose={onClose} modal={modal} />
		))
		.with({ type: "buffer" }, (modal) => (
			<BufferDialog onClose={onClose} modal={modal} />
		))
		.with({ type: "export-svg" }, () => <ExportSVGDialog />)
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
