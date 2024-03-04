import Head from "next/head";
import { Converter } from "app/components/converter";
import { formatTitle } from "app/lib/utils";

const PlacemarkConverter = () => {
  return (
    <>
      <Head>
        <title>{formatTitle("Free map file converter")}</title>
        <meta
          name="description"
          content="Convert everything from GeoJSON to KML into formats like CSV and
          Excel. Converts all your geospatial data"
        />
        <style>
          {`
            body {
              background: #faf5ff;  /* fallback for old browsers */
              background: -webkit-linear-gradient(to right, #faf5ff, #e9d5ff);  /* Chrome 10-25, Safari 5.1-6 */
              background: linear-gradient(to right, #faf5ff, #e9d5ff); /* W3C, IE 10+/ Edge, Firefox 16+, Chrome 26+, Opera 12+, Safari 7+ */
            }
        `}
        </style>
      </Head>
      <Converter />
    </>
  );
};

export default PlacemarkConverter;
