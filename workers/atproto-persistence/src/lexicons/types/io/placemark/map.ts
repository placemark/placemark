import type {} from '@atcute/lexicons';
import * as v from '@atcute/lexicons/validations';
import type {} from '@atcute/lexicons/ambient';

const _mainSchema = /*#__PURE__*/ v.record(
	/*#__PURE__*/ v.string(),
	/*#__PURE__*/ v.object(
		{
			"$type": /*#__PURE__*/ v.literal("io.placemark.map"),
			/**
			 * The map's feature data, encoded as FlatGeobuf.
			 * @accept application/flatgeobuf
			 */
			"data": /*#__PURE__*/ v.constrain(
				/*#__PURE__*/ v.blob(),
				[/*#__PURE__*/ v.blobAccept(["application/flatgeobuf"])]
			),
			/**
			 * Folder tree for organizing features. Validated by the app's own Zod schemas, not by this lexicon.
			 */
			"folders": /*#__PURE__*/ v.unknown(),
			/**
			 * The selected base layer, omitted when the map has none. Validated by the app's own Zod schemas, not by this lexicon.
			 */
			"layer": /*#__PURE__*/ v.optional(/*#__PURE__*/ v.unknown()),
			/**
			 * Configured map layers. Validated by the app's own Zod schemas, not by this lexicon.
			 */
			"layerConfigs": /*#__PURE__*/ v.unknown(),
			/**
			 * The map's display name.
			 */
			"name": /*#__PURE__*/ v.string(),
			/**
			 * Placemark's symbolization config. Validated by the app's own Zod schemas, not by this lexicon.
			 */
			"symbolization": /*#__PURE__*/ v.unknown(),
			/**
			 * When this record was last written, as an ISO 8601 timestamp.
			 */
			"updatedAt": /*#__PURE__*/ v.datetimeString(),
		}
	)
);
type main$schematype = typeof _mainSchema;

export interface mainSchema extends main$schematype {}
export const mainSchema = _mainSchema as mainSchema;

export interface Main extends v.InferInput<typeof mainSchema> {}
declare module '@atcute/lexicons/ambient' {
	interface Records {
		"io.placemark.map": mainSchema;
	}
}
