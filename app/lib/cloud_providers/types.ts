/**
 * Message of the `Error` a provider's `signIn` rejects with when the
 * user abandons the flow (e.g. closes the OAuth popup). Shared so call
 * sites can tell a user cancellation apart from a real failure without
 * statically importing a provider module — see cloud_providers/index.ts
 * on why those stay dynamically imported.
 */
export const SIGN_IN_CANCELLED = "Sign-in was cancelled";

export interface CloudMapSummary {
  rkey: string;
  name: string;
  updatedAt: string;
}

export interface CloudMapDocument {
  dataBase64: string;
  symbolization: unknown;
  layer: unknown;
  folders: unknown;
  layerConfigs: unknown;
}

export interface CloudAuthState {
  status: "signed-out" | "signed-in";
  handle?: string;
}

export interface CloudProvider {
  id: string;
  label: string;
  useAuthState(): CloudAuthState;
  /**
   * Runs the provider's sign-in flow. Resolves once the user is signed
   * in, and rejects if they cancel it or it fails.
   */
  signIn(handle: string): Promise<void>;
  signOut(): Promise<void>;
  listMaps(): Promise<CloudMapSummary[]>;
  saveMap(doc: CloudMapDocument, name: string): Promise<CloudMapSummary>;
  loadMap(rkey: string): Promise<CloudMapDocument>;
  updateMap(
    rkey: string,
    doc: CloudMapDocument,
    name?: string,
  ): Promise<CloudMapSummary>;
  deleteMap(rkey: string): Promise<void>;
}
