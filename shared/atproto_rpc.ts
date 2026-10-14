import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";

export class Unauthenticated extends Schema.TaggedError<Unauthenticated>()(
  "Unauthenticated",
  {},
) {}

export class RecordNotFound extends Schema.TaggedError<RecordNotFound>()(
  "RecordNotFound",
  { rkey: Schema.String },
) {}

export class BlobTooLarge extends Schema.TaggedError<BlobTooLarge>()(
  "BlobTooLarge",
  { maxBytes: Schema.Number, actualBytes: Schema.Number },
) {}

export class CloudMapSummary extends Schema.Class<CloudMapSummary>(
  "CloudMapSummary",
)({
  rkey: Schema.String,
  name: Schema.String,
  updatedAt: Schema.String,
}) {}

export class CloudMapDocument extends Schema.Class<CloudMapDocument>(
  "CloudMapDocument",
)({
  dataBase64: Schema.String,
  symbolization: Schema.Unknown,
  layer: Schema.Unknown,
  folders: Schema.Unknown,
  layerConfigs: Schema.Unknown,
}) {}

const NotFoundOrAuth = Schema.Union([Unauthenticated, RecordNotFound]);

export class MapRpcs extends RpcGroup.make(
  Rpc.make("Me", {
    success: Schema.Struct({ did: Schema.String, handle: Schema.String }),
    error: Unauthenticated,
  }),
  Rpc.make("Logout", {}),
  Rpc.make("ListMaps", {
    success: Schema.Array(CloudMapSummary),
    error: Unauthenticated,
  }),
  Rpc.make("SaveMap", {
    payload: { name: Schema.String, doc: CloudMapDocument },
    success: CloudMapSummary,
    error: Unauthenticated,
  }),
  Rpc.make("LoadMap", {
    payload: { rkey: Schema.String },
    success: CloudMapDocument,
    error: NotFoundOrAuth,
  }),
  Rpc.make("UpdateMap", {
    payload: {
      rkey: Schema.String,
      name: Schema.optional(Schema.String),
      doc: CloudMapDocument,
    },
    success: CloudMapSummary,
    error: NotFoundOrAuth,
  }),
  Rpc.make("DeleteMap", {
    payload: { rkey: Schema.String },
    error: NotFoundOrAuth,
  }),
) {}
