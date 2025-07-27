import { StrictMode, Suspense, useRef } from "react";
import { PersistenceContext } from "app/lib/persistence/context";
import { MemPersistence } from "app/lib/persistence/memory";
import { Provider, createStore } from "jotai";
import { UIDMap } from "app/lib/id_mapper";
import { Store, layerConfigAtom } from "state/jotai";
import { newFeatureId } from "app/lib/id";
import LAYERS from "app/lib/default_layers";
import { createRoot } from "react-dom/client";
import { PlacemarkPlay } from "app/components/placemark_play";
import Converter from "./converter";
import { Route, Switch } from "wouter";
import "../styles/globals.css";
import { Tooltip as T } from "radix-ui";
import { QueryClientProvider, QueryClient } from "react-query";
import { StyleGuide } from "app/components/style_guide";

const queryClient = new QueryClient();

function ScratchpadInner({ store }: { store: Store }) {
	const idMap = useRef(UIDMap.empty());

	return (
		<PersistenceContext.Provider
			value={new MemPersistence(idMap.current, store)}
		>
			<>
				<title>Placemark Play</title>
				<Suspense fallback={null}>
					<PlacemarkPlay />
				</Suspense>
			</>
		</PersistenceContext.Provider>
	);
}

const Play = () => {
	const store = createStore();
	const layerId = newFeatureId();

	store.set(
		layerConfigAtom,
		new Map([
			[
				layerId,
				{
					...LAYERS.MONOCHROME,
					at: "a0",
					opacity: 1,
					tms: false,
					visibility: true,
					labelVisibility: true,
					id: layerId,
				},
			],
		]),
	);

	return (
		<Provider key="play" store={store}>
			<ScratchpadInner store={store} />
		</Provider>
	);
};

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<T.Provider>
				<Switch>
					<Route path="/">
						<Play />
					</Route>
					<Route path="/converter">
						<Converter />
					</Route>
					<Route path="/secret-styleguide">
						<StyleGuide />
					</Route>
				</Switch>
			</T.Provider>
		</QueryClientProvider>
	</StrictMode>,
);
