import Link from "next/link";
import { BlitzPage, useRouterQuery } from "@blitzjs/next";
import Layout from "app/core/layouts/Layout";
import React from "react";
import { ERROR_CODES, SUPPORT_EMAIL } from "app/lib/constants";
import { z } from "zod";
import { styledInlineA, TextWell } from "app/components/elements";

const Query = z.object({
  code: z.string().refine((value): value is keyof typeof ERROR_CODES => {
    return value in ERROR_CODES;
  }),
});

const ErrorPage: BlitzPage = () => {
  const res = Query.safeParse(useRouterQuery());
  if (!res.success) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-xs">
          <div className="text-md text-center text-black">Unexpected error</div>
        </div>
      </div>
    );
  }
  const { code } = res.data;
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="max-w-xl space-y-8">
        <TextWell variant="destructive" size="md">
          Error: {ERROR_CODES[code]}{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}&subject=Error (ID: ${code})`}
            className={styledInlineA}
          >
            Contact support: {SUPPORT_EMAIL}
          </a>
        </TextWell>
        <div>
          <Link href="/" className={styledInlineA}>
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

ErrorPage.getLayout = (page) => <Layout title="Error">{page}</Layout>;

export default ErrorPage;
