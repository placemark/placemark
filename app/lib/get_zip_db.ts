import once from "lodash/once";

export type ZipDB = { [key: string]: Pos2 };

export const getZipDB = once(async function getZipDB() {
  const response = await fetch("/zip-lookup.json");
  if (!response.ok) throw new Error("Could not load ZIP Database");
  return (await response.json()) as ZipDB;
});
