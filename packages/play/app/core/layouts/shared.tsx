import Head from "next/head";
import type { ReactNode } from "react";

export type LayoutProps = {
  title: string;
  children: ReactNode;
};

export function LayoutHead({
  title,
  children,
}: React.PropsWithChildren<Pick<LayoutProps, "title">>) {
  return (
    <Head>
      <title>{title || "Placemark"}</title>
      <link rel="icon" href="/favicon.ico" />
      {children}
    </Head>
  );
}
