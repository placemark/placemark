# Routing providers

Routing is disabled until a provider is configured. Placemark supports
openrouteservice, Geoapify, and profile-specific OSRM endpoints.

## Why Mapbox Directions is not used

Placemark stores generated route geometry in the document and includes it in
exports. Section 2.10.1 of the
[Mapbox Product Terms](https://cdn.prod.website-files.com/609ed46055e27a02ffc0749b/6a60463142f6478d57642594_Mapbox%20Product%20Terms%20%28July%2021%2C%202026%29.pdf)
says that Navigation API results may not be exported, downloaded, cached, or
stored. This is a restriction in the Mapbox service terms, separate from the
Mapbox GL JS and Mapbox Style Specification licenses.

## Exporting results

| Provider | Storage and export |
| --- | --- |
| openrouteservice | Allowed under CC BY 4.0 with openrouteservice, HeiGIT, and OpenStreetMap attribution. |
| Geoapify | Explicitly permits caching, storage, and redistribution. OpenStreetMap attribution is always required, and Geoapify attribution is required on the free plan. |
| OSRM | Depends on the routed dataset and the operator's terms. For self-hosted OSRM using OpenStreetMap, retain OpenStreetMap attribution. Bulk extraction may have additional ODbL obligations. |

Placemark stores the applicable attribution on each generated route. See the
[openrouteservice terms](https://openrouteservice.org/terms-of-service/),
[Geoapify terms](https://www.geoapify.com/terms-and-conditions/), and
[OpenStreetMap license](https://www.openstreetmap.org/copyright/).

## openrouteservice

Hosted openrouteservice supports driving, walking, and cycling:

```sh
VITE_PUBLIC_ROUTING_PROVIDER=openrouteservice
VITE_PUBLIC_ROUTING_API_KEY=<your key>
```

Set `VITE_PUBLIC_ROUTING_URL` to the base directions URL when using a
self-hosted instance. Results from the hosted service require attribution under
the [openrouteservice terms](https://openrouteservice.org/terms-of-service/).

## Geoapify

Geoapify supports driving, walking, and cycling:

```sh
VITE_PUBLIC_ROUTING_PROVIDER=geoapify
VITE_PUBLIC_ROUTING_API_KEY=<your key>
```

Set `VITE_PUBLIC_ROUTING_URL` to use a compatible custom endpoint. Geoapify
permits route results to be stored and redistributed with attribution. Review
the current [Geoapify Routing API documentation](https://www.geoapify.com/routing-api/)
for plan limits and terms.

## OSRM

OSRM needs one endpoint for each available routing profile:

```sh
VITE_PUBLIC_ROUTING_PROVIDER=osrm
VITE_PUBLIC_OSRM_DRIVING_URL=https://router.example/route/v1/driving
VITE_PUBLIC_OSRM_WALKING_URL=https://router.example/route/v1/walking
VITE_PUBLIC_OSRM_CYCLING_URL=https://router.example/route/v1/cycling
```

Each value is the route service URL before the coordinate list. Only configured
profiles appear in Placemark. Separate URLs are necessary because an OSRM
server's routing profile is selected when its data is prepared, not by the
profile label in the request path. Use a service you operate or have permission
to use. Public demo servers are not suitable for production traffic.

## Attribution and keys

Placemark shows the configured routing provider in the map attribution and
saves provider and attribution fields on each route. Keep that attribution when
redistributing exported data.

All `VITE_PUBLIC_*` values are included in client-side code. Apply referrer or
domain restrictions to hosted-provider keys. For stricter key protection, send
routing requests through a server-side proxy.
