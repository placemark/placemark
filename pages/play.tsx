import Head from "next/head";
import { BlitzPage } from "@blitzjs/next";
import { Suspense, useRef } from "react";
import Layout from "app/core/layouts/Layout";
import { PlacemarkPlay } from "app/components/placemark_play";
import { PersistenceContext } from "app/lib/persistence/context";
import { MemPersistence } from "app/lib/persistence/memory";
import { Provider, createStore } from "jotai";
import { UIDMap } from "app/lib/id_mapper";
import { layerConfigAtom } from "state/jotai";
import { newFeatureId } from "app/lib/id";
import LAYERS from "app/lib/default_layers";
import { formatTitle } from "app/lib/utils";

function ScratchpadInner() {
  const idMap = useRef(UIDMap.empty());

  return (
    <PersistenceContext.Provider value={new MemPersistence(idMap.current)}>
      <>
        <Head>
          <title>{formatTitle("Play")}</title>
        </Head>
        <Suspense fallback={null}>
          <PlacemarkPlay />
        </Suspense>
      </>
    </PersistenceContext.Provider>
  );
}

const Play: BlitzPage = () => {
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

Play.getLayout = (page) => <Layout title="Placemark">{page}</Layout>;

export default Play;
