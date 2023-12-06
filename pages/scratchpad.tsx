import { gSSP } from "app/blitz-server";
import Head from "next/head";
import { getSession } from "@blitzjs/auth";
import { BlitzPage, Routes } from "@blitzjs/next";
import { Suspense, useRef } from "react";
import Layout from "app/core/layouts/Layout";
import { PlacemarkInner } from "app/components/placemark_inner";
import { PersistenceContext } from "app/lib/persistence/context";
import { MemPersistence } from "app/lib/persistence/memory";
import { createStore, Provider } from "jotai";
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
          <title>{formatTitle("Scratchpad")}</title>
        </Head>
        <Suspense fallback={null}>
          <PlacemarkInner />
        </Suspense>
      </>
    </PersistenceContext.Provider>
  );
}

const Scratchpad: BlitzPage = () => {
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
    <Provider key="scratchpad" store={store}>
      <ScratchpadInner />
    </Provider>
  );
};

Scratchpad.authenticate = { redirectTo: Routes.SigninPage().pathname };
Scratchpad.getLayout = (page) => <Layout title="Placemark">{page}</Layout>;

export const getServerSideProps = gSSP(async ({ req, res }) => {
  const session = await getSession(req, res);

  if (session.userId === null) {
    return {
      redirect: {
        destination: Routes.SigninPage().pathname,
        permanent: false,
      },
    };
  }

  if (session.orgId === undefined) {
    return {
      redirect: {
        destination: Routes.NewOrganization().pathname,
        permanent: false,
      },
    };
  }

  return { props: {} };
});

export default Scratchpad;
