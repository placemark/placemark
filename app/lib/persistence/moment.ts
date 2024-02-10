import type {
  IFolder,
  IFolderInput,
  ILayerConfig,
  IWrappedFeature,
  IWrappedFeatureInput,
} from "types";

/**
 * An entry in history, an 'undo' or a 'redo'.
 * Which direction it is isn't contained here,
 * but in whether it's in the undo or redo side
 * of a MomentLog.
 */
export interface Moment {
  note?: string;
  putFeatures: IWrappedFeature[];
  deleteFeatures: IWrappedFeature["id"][];
  putFolders: IFolder[];
  deleteFolders: IFolder["id"][];
  putLayerConfigs: ILayerConfig[];
  deleteLayerConfigs: ILayerConfig["id"][];
}

// This was previously posthog properties,
// is now just an unknown.
type Properties = any;

export interface MomentInput {
  note?: string;
  track?: string | [string, Properties];
  putFeatures: IWrappedFeatureInput[];
  deleteFeatures: IWrappedFeature["id"][];
  putFolders: IFolderInput[];
  deleteFolders: IFolder["id"][];
  putLayerConfigs: ILayerConfig[];
  deleteLayerConfigs: ILayerConfig["id"][];
}

/**
 * Factory method (f) to generate moments.
 */
export function fMoment(note?: string): Moment {
  return {
    note,
    putFeatures: [],
    deleteFeatures: [],
    putFolders: [],
    deleteFolders: [],
    putLayerConfigs: [],
    deleteLayerConfigs: [],
  };
}

export const EMPTY_MOMENT: Moment = {
  putFolders: [],
  deleteFolders: [],
  putFeatures: [],
  deleteFeatures: [],
  putLayerConfigs: [],
  deleteLayerConfigs: [],
};

export interface MomentLog {
  undo: Moment[];
  redo: Moment[];
  paused: boolean;
}

const HISTORY_LIMIT = 100;

export class CMomentLog implements MomentLog {
  /**
   * Undo operations, in order from
   * most to least recent. undo[0] is
   * the last thing that was done.
   */
  undo: Moment[];
  redo: Moment[];
  paused: boolean;
  constructor() {
    this.undo = [];
    this.redo = [];
    this.paused = false;
  }
}

export const OPPOSITE = {
  undo: "redo",
  redo: "undo",
} as const;

class CUMoment {
  merge(...moments: Moment[]) {
    const first = moments[0];

    const dst: Moment = {
      note: first.note,
      putFeatures: first.putFeatures.slice(),
      deleteFeatures: first.deleteFeatures.slice(),
      putFolders: first.putFolders.slice(),
      deleteFolders: first.deleteFolders.slice(),
      putLayerConfigs: first.putLayerConfigs.slice(),
      deleteLayerConfigs: first.deleteLayerConfigs.slice(),
    };

    for (const moment of moments.slice(1)) {
      dst.putFeatures = dst.putFeatures.concat(moment.putFeatures);
      dst.deleteFeatures = dst.deleteFeatures.concat(moment.deleteFeatures);
      dst.deleteFolders = dst.deleteFolders.concat(moment.deleteFolders);
      dst.putFolders = dst.putFolders.concat(moment.putFolders);
      dst.deleteLayerConfigs = dst.deleteLayerConfigs.concat(
        moment.deleteLayerConfigs
      );
      dst.putLayerConfigs = dst.putLayerConfigs.concat(moment.putLayerConfigs);
    }

    return dst;
  }

  /**
   * Does this moment contain nothing?
   * Make sure to update this whenever moments get new arrays!
   */
  isEmpty(moment: Moment) {
    return (
      moment.putFolders.length === 0 &&
      moment.deleteFolders.length === 0 &&
      moment.putFeatures.length === 0 &&
      moment.deleteFeatures.length === 0 &&
      moment.putLayerConfigs.length === 0 &&
      moment.deleteLayerConfigs.length === 0
    );
  }
}

export const UMoment = new CUMoment();

class CUMomentLog {
  shallowCopy(oldLog: MomentLog): MomentLog {
    return {
      undo: oldLog.undo.slice(),
      redo: oldLog.redo.slice(),
      paused: oldLog.paused,
    };
  }

  hasUndo(log: Readonly<MomentLog>) {
    return log.undo.length > 0;
  }

  hasRedo(log: Readonly<MomentLog>) {
    return log.redo.length > 0;
  }

  popMoment(oldLog: Readonly<MomentLog>, n = 1) {
    const momentLog = this.shallowCopy(oldLog);
    for (let i = 0; i < n; i++) {
      momentLog.undo.shift();
    }
    return momentLog;
  }

  startSnapshot(
    oldLog: Readonly<MomentLog>,
    before: IWrappedFeature | IWrappedFeature[]
  ) {
    const momentLog = this.shallowCopy(oldLog);
    momentLog.paused = true;
    if (before) {
      const moment = fMoment("Drag");
      if (Array.isArray(before)) {
        moment.putFeatures = moment.putFeatures.concat(before);
      } else {
        moment.putFeatures.push(before);
      }
      momentLog.undo = [moment].concat(momentLog.undo).slice(0, HISTORY_LIMIT);
    }
    return momentLog;
  }

  endSnapshot(oldLog: MomentLog) {
    const momentLog = this.shallowCopy(oldLog);
    momentLog.paused = false;
    return momentLog;
  }

  /**
   * Record the 'reverse' state
   * for a given transaction.
   */
  pushMoment(oldLog: MomentLog, moment: Moment): MomentLog {
    if (UMoment.isEmpty(moment)) {
      return oldLog;
    }
    const momentLog = this.shallowCopy(oldLog);
    // If there is future history, delete it.
    // There is a single linear history.
    if (momentLog.redo.length) {
      momentLog.redo = [];
    }
    momentLog.undo = [moment].concat(momentLog.undo).slice(0, HISTORY_LIMIT);
    return momentLog;
  }
}

export const UMomentLog = new CUMomentLog();
