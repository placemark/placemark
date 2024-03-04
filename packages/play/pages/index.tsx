import Head from "next/head";
import { Suspense, useRef } from "react";
import { PersistenceContext } from "app/lib/persistence/context";
import { MemPersistence } from "app/lib/persistence/memory";
import { Provider, createStore } from "jotai";
import { UIDMap } from "app/lib/id_mapper";
import { layerConfigAtom } from "state/jotai";
import { newFeatureId } from "app/lib/id";
import LAYERS from "app/lib/default_layers";
import dynamic from "next/dynamic";

const PlacemarkPlay = dynamic(
  () => import("app/components/placemark_play").then((m) => m.PlacemarkPlay),
  {
    ssr: false,
  }
);

function ScratchpadInner() {
  const idMap = useRef(UIDMap.empty());

  return (
    <PersistenceContext.Provider value={new MemPersistence(idMap.current)}>
      <>
        <Head>
          <title>Placemark Play</title>
        </Head>
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
          id: layerId,
        },
      ],
    ])
  );

  return (
    <Provider key="play" store={store}>
      <ScratchpadInner />
    </Provider>
  );
};

export default Play;
