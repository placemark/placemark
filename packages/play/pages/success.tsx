import { useRouter } from "next/router";
import { Routes, BlitzPage } from "@blitzjs/next";
import Layout from "app/core/layouts/Layout";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";

const Success: BlitzPage = () => {
  const router = useRouter();
  const redirected = useRef<boolean>(false);

  /**
   * Delete abandoned organization
   */
  useEffect(() => {
    if (redirected.current) return;
    redirected.current = true;
    toast("Created organization");
    void router.push(Routes.PlacemarkIndex());
  }, [router, redirected]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="max-w-xs">
        <div className="text-md text-center text-black">
          Welcome to your new organization on Placemark!
        </div>
      </div>
    </div>
  );
};

Success.getLayout = (page) => <Layout title="Success">{page}</Layout>;

export default Success;
