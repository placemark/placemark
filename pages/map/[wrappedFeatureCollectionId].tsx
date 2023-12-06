import { gSSP } from "app/blitz-server";
import { getSession } from "@blitzjs/auth";
import { BlitzPage, Routes, useParam } from "@blitzjs/next";
import { Suspense, useEffect, useRef, useState } from "react";
import Layout from "app/core/layouts/Layout";
import { PlacemarkInner } from "app/components/placemark_inner";
import { PersistenceContext } from "app/lib/persistence/context";
import { pokeURL } from "app/lib/replicache/api_utils";
import { blitzPusher, blitzPuller } from "app/lib/replicache/blitz";
import { RepPersistence } from "app/lib/persistence/replicache";
import { clientMutators } from "app/lib/replicache/client/mutators";
import { ExperimentalMemKVStore, Replicache } from "replicache";
import { env } from "app/lib/env_client";
import { SCHEMA_VERSION } from "app/lib/constants";
import { dialogAtom, syncingMachineAtom } from "state/jotai";
import { useAtom, Provider, useSetAtom, createStore } from "jotai";
import { UIDMap } from "app/lib/id_mapper";
import ReconnectingEventSource from "reconnecting-eventsource";
import { useWatchCallback } from "app/hooks/use_watch_callback";
import { DialogState } from "state/dialog_state";

function PersistedMapInner({ userId }: { userId: number }) {
  const idMap = useRef(UIDMap.empty());
  const [, sendToSyncingMachine] = useAtom(syncingMachineAtom);
  const setDialogState = useSetAtom(dialogAtom);
  const [rep, setRep] = useState<RepPersistence | null>(null);
  const wrappedFeatureCollectionId = useParam(
    "wrappedFeatureCollectionId",
    "string"
  )!;

  const watchCallback = useWatchCallback({
    wrappedFeatureCollectionId,
    userId,
    idMap,
  });

  useEffect(() => {
    if (!process.browser || !wrappedFeatureCollectionId) return;

    const query = `?${new URLSearchParams({
      wrappedFeatureCollectionId,
    }).toString()}`;

    // TODO: define custom puller to make this process more efficient?
    // Could definitely cut down on payloads if this was encoded.
    const name = `${userId}/${wrappedFeatureCollectionId}`;
    const rep = new Replicache({
      name,
      pushURL: `/api/replicache-push${query}`,
      pullURL: `/api/replicache-pull${query}`,
      schemaVersion: SCHEMA_VERSION,
      pusher: blitzPusher,
      puller: blitzPuller,
      mutators: clientMutators,
      licenseKey: env.NEXT_PUBLIC_REPLICACHE_KEY,
      experimentalCreateKVStore: (name) => new ExperimentalMemKVStore(name),
    });

    rep.getAuth = () => {
      let resolve = (() => null) as (value: any) => void;
      const done = new Promise<null>((_resolve) => (resolve = _resolve));
      setDialogState({
        type: "reauth",
        resolve,
      });
      return done;
    };

    rep.onSync = (syncing) => sendToSyncingMachine(syncing ? "SYNC" : "UNSYNC");

    rep.experimentalWatch(watchCallback, { initialValuesInFirstDiff: true });

    const ev = new ReconnectingEventSource(
      pokeURL(wrappedFeatureCollectionId),
      {
        withCredentials: true,
      }
    );

    ev.addEventListener("message", (event) => {
      if (event.data === "poke") {
        rep.pull();
      }
    });

    setRep(
      new RepPersistence({
        rep,
        wrappedFeatureCollectionId,
        idMap: idMap.current,
      })
    );

    return () => {
      ev.close();
      void rep.close();
    };
  }, [
    setRep,
    wrappedFeatureCollectionId,
    userId,
    watchCallback,
    sendToSyncingMachine,
    setDialogState,
  ]);

  return rep ? (
    <PersistenceContext.Provider value={rep}>
      <Suspense fallback={null}>
        <PlacemarkInner />
      </Suspense>
    </PersistenceContext.Provider>
  ) : null;
}

// TODO: this prop could be inferred.
const PersistedMap: BlitzPage<{ userId: number }> = ({ userId }) => {
  // This is a workaround for how we do "drop a file on the index page."
  // Because Jotai Providers are different, it's no longer possible to just
  // router.push and then set the dialog state.
  const store = createStore();

  const initialDialog =
    typeof window === "object" &&
    ((window as any).initialDialog as DialogState);

  if (initialDialog) {
    store.set(dialogAtom, initialDialog);
    setTimeout(() => {
      (window as any).initialDialog = null;
    }, 1000);
  }

  const wrappedFeatureCollectionId = useParam(
    "wrappedFeatureCollectionId",
    "string"
  )!;
  return (
    <Provider key={wrappedFeatureCollectionId} store={store}>
      <PersistedMapInner userId={userId} />
    </Provider>
  );
};

PersistedMap.authenticate = { redirectTo: Routes.SigninPage().pathname };
PersistedMap.getLayout = (page) => <Layout title="Placemark">{page}</Layout>;

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

  return {
    props: {
      userId: session.userId,
    },
  };
});

export default PersistedMap;
