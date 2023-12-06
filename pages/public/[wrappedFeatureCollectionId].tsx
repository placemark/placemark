import Head from "next/head";
import { invoke, useQuery } from "@blitzjs/rpc";
import { BlitzPage, useParam } from "@blitzjs/next";
import { useQuery as useReactQuery } from "react-query";
import { Suspense, useMemo } from "react";
import Layout from "app/core/layouts/Layout";
import { PlacemarkInnerPublic } from "app/components/placemark_inner_public";
import { PersistenceContext } from "app/lib/persistence/context";
import { UIDMap } from "app/lib/id_mapper";
import { PublicPersistence } from "app/lib/persistence/public";
import getWrappedFeatureCollectionData from "app/wrappedFeatureCollections/queries/getWrappedFeatureCollectionData";
import getWrappedFeatureCollectionFeatures from "app/wrappedFeatureCollections/queries/getWrappedFeatureCollectionFeatures";
import { createStore, Provider } from "jotai";
import { dataAtom, layerConfigAtom } from "state/jotai";
import { USelection } from "state";
import { PersistenceMetadataPersisted } from "app/lib/persistence/ipersistence";
import { getExtent } from "app/lib/geometry";
import { Loading } from "app/components/elements";
import { IWrappedFeature } from "types";

function PublicMapInner() {
  const wrappedFeatureCollectionId = useParam(
    "wrappedFeatureCollectionId",
    "string"
  )!;

  const [data] = useQuery(getWrappedFeatureCollectionData, {
    id: wrappedFeatureCollectionId,
  });

  const { data: features } = useReactQuery(
    [wrappedFeatureCollectionId],
    async () => {
      let features: IWrappedFeature[] = [];
      let nextCursor: string | undefined = undefined;

      while (true) {
        const data = await invoke(getWrappedFeatureCollectionFeatures, {
          id: wrappedFeatureCollectionId,
          cursor: nextCursor,
        });
        features = features.concat(data.items);
        if (data.cursor) {
          nextCursor = data.cursor as string | undefined;
        } else {
          break;
        }
      }

      return features;
    },
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      suspense: true,
    }
  );

  const initialExtent = useMemo(() => {
    const extent = getExtent(features!).orDefault([
      -180, -90, 180, 90,
    ]) as BBox4;
    return extent;
  }, [features]);

  const store = useMemo(() => {
    const store = createStore();
    // This never matters because we return null
    // anyway.
    if (!features) return store;
    store.set(
      layerConfigAtom,
      new Map(data.layerConfigs.map((config) => [config.id, config]))
    );
    store.set(dataAtom, {
      selection: USelection.none(),
      folderMap: new Map(data.folders.map((folder) => [folder.id, folder])),
      featureMap: new Map(features.map((feature) => [feature.id, feature])),
    });
    return store;
  }, [data.layerConfigs, data.folders, features]);

  /**
   * This should never happen, because react-query has suspense: true.
   */
  if (!features) {
    return null;
  }

  return (
    <Provider store={store}>
      <PersistenceContext.Provider
        value={
          new PublicPersistence(
            {
              type: "persisted",
              ...data.meta,
            } as PersistenceMetadataPersisted,
            UIDMap.loadIdsFromPersistence(features)
          )
        }
      >
        <PlacemarkInnerPublic initialExtent={initialExtent} />
      </PersistenceContext.Provider>
    </Provider>
  );
}

const PublicMap: BlitzPage = () => {
  return (
    <>
      <Head>
        <meta name="robots" content="noindex" />
      </Head>
      <main className="h-screen flex flex-col bg-white dark:bg-gray-800">
        <Suspense fallback={<Loading />}>
          <PublicMapInner />
        </Suspense>
      </main>
    </>
  );
};

PublicMap.getLayout = (page) => <Layout title="Placemark">{page}</Layout>;

export default PublicMap;
