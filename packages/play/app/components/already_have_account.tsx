import Link from "next/link";
import { Routes } from "@blitzjs/next";
import React from "react";
import { styledInlineA } from "app/components/elements";

export function AlreadyHaveAccount({
  forgotPasswordLink,
  signup,
}: {
  forgotPasswordLink?: boolean;
  signup?: boolean;
}) {
  return (
    <div className="text-sm pt-10">
      Other sign-in options:
      <ul className="list-disc pl-4 pt-2">
        {signup ? (
          <li>
            <Link href={Routes.SignupPage()} className={styledInlineA}>
              Sign up
            </Link>
          </li>
        ) : (
          <li>
            <Link href={Routes.SigninPage()} className={styledInlineA}>
              Sign in
            </Link>
          </li>
        )}
        <li>
          <Link href={Routes.SigninSSOPage()} className={styledInlineA}>
            Sign in with SSO
          </Link>
        </li>
        {forgotPasswordLink ? (
          <li>
            <Link href={Routes.ForgotPasswordPage()} className={styledInlineA}>
              Forgot your password?
            </Link>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
