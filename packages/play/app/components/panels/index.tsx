import dynamic from "next/dynamic";
import { memo } from "react";
import {
  showPanelBottomAtom,
  TabOption,
  tabAtom,
  splitsAtom,
} from "state/jotai";
import { useAtom, useAtomValue } from "jotai";
import { useHotkeys } from "integrations/hotkeys";
import clsx from "clsx";

const FeatureTable = dynamic(
  () => import("app/components/panels/feature_table")
);
import FeatureEditor from "app/components/panels/feature_editor";
import { DefaultErrorBoundary } from "app/components/elements";
import { FeatureEditorFolderInner } from "./feature_editor/feature_editor_folder";
const SymbolizationEditor = dynamic(
  () => import("app/components/panels/symbolization_editor")
);
import { EyeOpenIcon } from "@radix-ui/react-icons";

const TAB_ORDER_RIGHT = [TabOption.Feature, TabOption.Table];
const TAB_ORDER_BOTTOM = [TabOption.Table, TabOption.Feature, TabOption.List];

function Tab({
  onClick,
  active,
  label,
  ...attributes
}: {
  onClick: () => void;
  active: boolean;
  label: React.ReactNode;
} & React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      role="tab"
      onClick={onClick}
      aria-selected={active}
      className={clsx(
        "text-left text-sm py-1 px-3 focus:outline-none",
        active
          ? "text-black dark:text-white"
          : `
          bg-gray-100 dark:bg-gray-900
          border-b
          border-gray-200 dark:border-black
          text-gray-500 dark:text-gray-400
          hover:text-black dark:hover:text-gray-200
          focus:text-black`
      )}
      {...attributes}
    >
      {label}
    </button>
  );
}

function previousTab(TAB_ORDER: TabOption[], activeTab: TabOption): TabOption {
  let nextTab = TAB_ORDER.indexOf(activeTab) - 1;
  if (nextTab < 0) nextTab = TAB_ORDER.length - 1;
  return TAB_ORDER[nextTab];
}

function nextTab(TAB_ORDER: TabOption[], activeTab: TabOption): TabOption {
  const nextTab = (TAB_ORDER.indexOf(activeTab) + 1) % TAB_ORDER.length;
  return TAB_ORDER[nextTab];
}

const ActiveTab = memo(function ActiveTab({
  activeTab,
}: {
  activeTab: TabOption;
}) {
  switch (activeTab) {
    case TabOption.Feature:
      return <FeatureEditor />;
    case TabOption.Table:
      return <FeatureTable />;
    case TabOption.List:
      return <FeatureEditorFolderInner />;
    case TabOption.Symbolization:
      return <SymbolizationEditor />;
  }
});

const TabList = memo(function TabList({
  tabOrder,
  setTab,
  activeTab,
  showSymbolization,
}: {
  tabOrder: TabOption[];
  activeTab: TabOption;
  setTab: React.Dispatch<React.SetStateAction<TabOption>>;
  showSymbolization: boolean;
}) {
  return (
    <div
      role="tablist"
      style={{
        gridTemplateColumns: `repeat(${tabOrder.length}, 1fr) min-content`,
      }}
      className="flex-0 grid h-8 flex-none
      sticky top-0 z-10
      bg-white dark:bg-gray-800
      divide-x divide-gray-200 dark:divide-black"
    >
      {tabOrder.map((tab) => (
        <Tab
          key={tab}
          onClick={() => setTab(tab)}
          active={activeTab === tab}
          label={tab}
        />
      ))}
      {showSymbolization ? (
        <Tab
          key="Symbolization"
          aria-label="Symbolization"
          title="Symbolization"
          onClick={() => setTab(TabOption.Symbolization)}
          active={activeTab === TabOption.Symbolization}
          label={<EyeOpenIcon />}
        />
      ) : null}
    </div>
  );
});

export const SidePanel = memo(function SidePanelInner() {
  const splits = useAtomValue(splitsAtom);
  if (!splits.rightOpen) return null;
  return (
    <div
      style={{
        width: splits.right,
      }}
      className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-900 relative"
    >
      <Panel tabOrder={TAB_ORDER_RIGHT} />
    </div>
  );
});

export const BottomPanel = memo(function BottomPanelInner() {
  const splits = useAtomValue(splitsAtom);
  const showPanel = useAtomValue(showPanelBottomAtom);
  if (!showPanel) return null;
  return (
    <div
      style={{
        height: splits.bottom,
      }}
      className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-900 relative"
    >
      <Panel tabOrder={TAB_ORDER_BOTTOM} showSymbolization={false} />
    </div>
  );
});

export const FullPanel = memo(function FullPanelInner() {
  return (
    <div className="flex flex-auto bg-white dark:bg-gray-800 relative">
      <Panel tabOrder={TAB_ORDER_BOTTOM} showSymbolization={false} />
    </div>
  );
});

export const Panel = memo(function PanelInner({
  tabOrder,
  showSymbolization = true,
}: {
  tabOrder: TabOption[];
  showSymbolization?: boolean;
}) {
  const [activeTab, setTab] = useAtom(tabAtom);

  useHotkeys(
    "]",
    () => {
      setTab(nextTab(tabOrder, activeTab));
    },
    [activeTab]
  );

  useHotkeys(
    "[",
    () => {
      setTab(previousTab(tabOrder, activeTab));
    },
    [activeTab]
  );

  return (
    <div className="absolute inset-0 flex flex-col">
      <TabList
        tabOrder={tabOrder}
        activeTab={activeTab}
        setTab={setTab}
        showSymbolization={showSymbolization}
      />
      <DefaultErrorBoundary>
        <ActiveTab activeTab={activeTab} />
      </DefaultErrorBoundary>
    </div>
  );
});
