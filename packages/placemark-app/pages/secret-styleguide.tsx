import Head from "next/head";
import { BlitzPage } from "@blitzjs/next";
import { StyleGuide } from "app/components/style_guide";

const SecretStyleGuide: BlitzPage = () => {
  return (
    <>
      <Head>
        <title>Secret styleguide</title>
      </Head>
      <StyleGuide />
    </>
  );
};

SecretStyleGuide.getLayout = (page) => <div>{page}</div>;

export default SecretStyleGuide;
