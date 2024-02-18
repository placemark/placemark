import { useCallback } from "react";
import type {
  IPersistence,
  MetaPair,
  MetaUpdatesInput,
  PersistenceMetadataPersisted,
} from "app/lib/persistence/ipersistence";
import { fMoment, MomentInput } from "app/lib/persistence/moment";
import { useAtomCallback } from "jotai/utils";
import { IDMap } from "app/lib/id_mapper";

export class PublicPersistence implements IPersistence {
  idMap: IDMap;
  meta: PersistenceMetadataPersisted;
  constructor(meta: PersistenceMetadataPersisted, idMap: IDMap) {
    this.meta = meta;
    this.idMap = idMap;
  }
  putPresence = async () => {};

  /**
   * This could and should be improved. It does do some weird stuff:
   * we need to write to the moment log and to features.
   */
  // eslint-disable-next-line

  // eslint-disable-next-line
  private apply = useAtomCallback(
    useCallback((_get, _set, _moment: MomentInput) => {
      return fMoment("noop");
    }, [])
  );

  // eslint-disable-next-line
  useTransact() {
    // eslint-disable-next-line
    return useAtomCallback(
      // eslint-disable-next-line
      useCallback(
        async (_get, _set, _partialMoment: Partial<MomentInput>) => {},
        []
      )
    );
  }

  useLastPresence() {
    return null;
  }

  useMetadata(): MetaPair {
    return [this.meta, (_updates: MetaUpdatesInput) => {}] as MetaPair;
  }

  // eslint-disable-next-line
  useHistoryControl = () => {
    return useAtomCallback(
      useCallback(async (_get, _set, _direction: "undo" | "redo") => {}, [])
    );
  };
}
