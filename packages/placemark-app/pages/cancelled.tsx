import { useRouter } from "next/router";
import { useMutation } from "@blitzjs/rpc";
import { BlitzPage, Routes } from "@blitzjs/next";
import Layout from "app/core/layouts/Layout";
import React, { useEffect, useRef } from "react";
import * as Sentry from "@sentry/nextjs";
import { toast } from "react-hot-toast";
import deleteOrganization from "app/organizations/mutations/deleteOrganization";

const Cancelled: BlitzPage = () => {
  const [deleteOrganizationMutation] = useMutation(deleteOrganization);
  const router = useRouter();
  const { session_id } = useRouter().query;
  const deleted = useRef<boolean>(false);

  /**
   * Delete abandoned organization
   */
  useEffect(() => {
    if (!session_id || Array.isArray(session_id)) {
      // Unexpected, just redirect.
      // Maybe someone arrived on this page accidentally?
      void router.push(Routes.PlacemarkIndex());
      return;
    }
    // Prevent this ever running multiple times.
    if (deleted.current) return;
    deleted.current = true;
    deleteOrganizationMutation({ session_id, force: true })
      .then(() => {
        toast("Cancelled creating an organization");
        return router.push(Routes.PlacemarkIndex());
      })
      .catch((e) => Sentry.captureException(e));
  }, [deleteOrganizationMutation, session_id, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="max-w-xs">
        <div className="text-md text-center text-black">
          Organization creation cancelled. Redirecting back to Placemark…
        </div>
      </div>
    </div>
  );
};

Cancelled.getLayout = (page) => <Layout title="Cancelled">{page}</Layout>;

export default Cancelled;
