import type { WriteTransaction, JSONValue, MaybePromise } from "replicache";
import type { PoolClient } from "pg";
import { z } from "zod";
import type { SimplifiedAuthenticatedSessionContext } from "./validations";

export type ZodMutationSchemaMap = Record<string, z.ZodObject<any>>;

type StringObjectKeys<T> = Extract<keyof T, string>;
type ObjectValues<T> = {
  [K in StringObjectKeys<T>]: T[K];
}[StringObjectKeys<T>];
type Tuplify<T> = [T, T, ...T[]];

/**
 * for an object mapping [key: mutator name] -> validation schema,
 * get the type of the functions that should be provided to replicache `mutators` key
 */
export type MutatorInputFns<Schema extends ZodMutationSchemaMap> = {
  [K in StringObjectKeys<Schema>]: (
    tx: WriteTransaction,
    args: z.input<Schema[K]>
  ) => MaybePromise<JSONValue | void>;
};

export type MutatorOutputFns<Schema extends ZodMutationSchemaMap> = {
  [K in StringObjectKeys<Schema>]: (
    tx: WriteTransaction,
    args: z.output<Schema[K]>
  ) => MaybePromise<JSONValue | void>;
};

/**
 * CLIENT
 * For each mutator function, returns a function that will first check that
 * the provided args pass validation and then call the mutator.
 *
 * @param schema the schema of [key: name] -> zod validator
 * @param mutators functions taking tx and args and applying a transformation
 * @returns an object of mutators that check their associated validator before applying a transformation
 */
export const applyValidators = <S extends ZodMutationSchemaMap>(
  schema: S,
  mutators: MutatorOutputFns<S>
): MutatorInputFns<S> =>
  Object.fromEntries(
    Object.keys(mutators).map((name) => {
      const fn = mutators[name] as MutatorInputFns<S>[keyof MutatorInputFns<S>];
      const validator = schema[name] as S[keyof S];

      const validationFn: typeof fn = (tx, args) => {
        const result = validator.parse(args);
        return fn(tx, result);
      };

      return [name, validationFn] as const;
    })
  ) as MutatorInputFns<S>;

type SerializedMutationValidator<
  K extends string,
  T extends z.ZodObject<any>
> = z.ZodObject<{
  name: z.ZodLiteral<K>;
  id: z.ZodNumber;
  args: T;
}>;

export type SerializedMutations<Schema extends ZodMutationSchemaMap> = {
  [K in StringObjectKeys<Schema>]: SerializedMutationValidator<K, Schema[K]>;
};

export type Mutations<Schema extends ZodMutationSchemaMap> = {
  [K in StringObjectKeys<Schema>]: z.infer<
    SerializedMutationValidator<K, Schema[K]>
  >;
}[StringObjectKeys<Schema>];

/**
 * This transforms the MutationSchema to the format the replicache push endpoint receives the
 * Mutation in
 * @param schema T
 * @returns
 */
export const toSerializedMutations = <Schema extends ZodMutationSchemaMap>(
  schema: Schema
) => {
  return Object.keys(schema)
    .map(
      (name) =>
        [
          name,
          z.object({
            name: z.literal(name),
            id: z.number(),
            args: schema[name]!,
          }),
        ] as const
    )
    .reduce(
      (acc, [name, z]) => ({ ...acc, [name]: z }),
      {} as Record<StringObjectKeys<Schema>, z.ZodObject<any>>
    ) as SerializedMutations<Schema>;
};

/**
 * SERVER
 * @param schema our mutation schema.
 * @returns
 */
export const createPushRequestValidator = <Schema extends ZodMutationSchemaMap>(
  schema: Schema
) => {
  const serialized = toSerializedMutations(schema);
  const mutationsArr = Object.values(serialized) as ObjectValues<
    typeof serialized
  >[];

  const pushRequest = z.object({
    clientID: z.string(),
    pushVersion: z.number(),
    schemaVersion: z.string(),
    // z.union expects at least 2 entries, so a plain array type won't suffice.
    mutations: z.array(
      z.union(mutationsArr as Tuplify<ObjectValues<typeof serialized>>)
    ),
  });
  return pushRequest;
};

export type MutatorPushFns<Schema extends ZodMutationSchemaMap> = {
  [K in StringObjectKeys<Schema>]: (
    tx: WriteTransaction,
    args: z.output<Schema[K]>
  ) => MaybePromise<JSONValue | void>;
};

export interface ContextBall {
  session: SimplifiedAuthenticatedSessionContext;
  version: number;
  client: PoolClient;
  clientID: string;
}

export type PushMutators<Schema extends ZodMutationSchemaMap> = {
  [K in StringObjectKeys<Schema>]: (
    args: z.output<Schema[K]>,
    ops: ContextBall
  ) => MaybePromise<JSONValue | void>;
};
