import Head from "next/head";
import Link from "next/link";
import { HomeIcon } from "@radix-ui/react-icons";
import Placemark from "app/components/icons/placemark";
import { formatTitle } from "app/lib/utils";

export default function Page404() {
  return (
    <>
      <Head>
        <title>{formatTitle("404: Page not found")}</title>
      </Head>
      <div className="h-screen flex items-center justify-center">
        <div className="w-64">
          <Placemark className="w-30" />
          <div className="pt-4 text-lg">Sorry, we couldn’t find that page.</div>
          <div className="pt-4 text-lg">
            <Link
              href="/"
              className="inline-flex items-center gap-x-2 underline"
            >
              <HomeIcon />
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
