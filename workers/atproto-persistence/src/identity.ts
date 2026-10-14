import {
  CompositeDidDocumentResolver,
  CompositeHandleResolver,
  DohJsonHandleResolver,
  LocalActorResolver,
  PlcDidDocumentResolver,
  WebDidDocumentResolver,
  WellKnownHandleResolver,
} from "@atcute/identity-resolver";

/**
 * Resolves a DID (or handle) to its DID document and PDS endpoint using
 * only public infrastructure (PLC directory, well-knowns, DNS-over-HTTPS).
 *
 * Shared by the OAuth flow and the public share endpoint: identity
 * resolution never needs authentication, which is what makes share links
 * work for recipients who are not signed in.
 */
export function buildActorResolver(): LocalActorResolver {
  return new LocalActorResolver({
    handleResolver: new CompositeHandleResolver({
      methods: {
        dns: new DohJsonHandleResolver({ dohUrl: "https://mozilla.cloudflare-dns.com/dns-query" }),
        http: new WellKnownHandleResolver(),
      },
    }),
    didDocumentResolver: new CompositeDidDocumentResolver({
      methods: {
        plc: new PlcDidDocumentResolver(),
        web: new WebDidDocumentResolver(),
      },
    }),
  });
}
