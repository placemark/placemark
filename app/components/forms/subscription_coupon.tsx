import { useQuery, useMutation, invalidateQuery } from "@blitzjs/rpc";
import { useAuthenticatedSession } from "@blitzjs/auth";
import { simpleRolesIsAuthorized } from "app/auth/utils";
import { toast } from "react-hot-toast";
import getOrganization from "app/organizations/queries/getOrganization";
import React from "react";
import { SettingsRow } from "pages/settings";
import { Form, FORM_ERROR } from "app/core/components/Form";
import LabeledTextField from "app/core/components/LabeledTextField";
import { ChangeCoupon } from "app/organizations/validations";
import changeOrganizationCoupon from "app/organizations/mutations/changeOrganizationCoupon";
import { Button } from "../elements";

function CouponCodeForm({ onSuccess }: { onSuccess: () => void }) {
  const [updateCouponMutation] = useMutation(changeOrganizationCoupon);
  return (
    <>
      <Form
        submitText="Update coupon"
        schema={ChangeCoupon}
        initialValues={{ code: "" }}
        onSubmit={async (values) => {
          try {
            await updateCouponMutation(values);
            await invalidateQuery(getOrganization, null);
            toast.success("Coupon updated");
            onSuccess();
          } catch (error: any) {
            return { [FORM_ERROR]: (error as Error).toString() };
          }
        }}
      >
        <LabeledTextField name="code" label="Coupon code" type="text" />
      </Form>

      <div className="pt-8 text-center">
        <Button
          variant="quiet"
          onClick={async () => {
            if (
              confirm("Are you sure you want to remove any existing coupons?")
            ) {
              await toast.promise(
                updateCouponMutation({
                  code: null,
                }),
                {
                  loading: "Removing coupon…",
                  success: "Coupon removed",
                  error: "Failed to remove coupon",
                }
              );
              await invalidateQuery(getOrganization, null);
              onSuccess();
            }
          }}
        >
          Remove existing coupon
        </Button>
      </div>
    </>
  );
}

export function SubscriptionCoupon() {
  const session = useAuthenticatedSession();
  const [{ customer }] = useQuery(getOrganization, null);

  const subscription = !customer?.deleted && customer?.subscriptions?.data[0];
  if (!subscription) {
    return null;
  }

  const couponName = subscription.discount?.coupon.name;
  const couponDescription =
    subscription.discount?.coupon?.metadata?.description;

  if (!simpleRolesIsAuthorized({ session, roles: ["OWNER", "SUPERADMIN"] })) {
    return null;
  }

  return (
    <SettingsRow
      label="Coupon code"
      preview={
        couponName ? (
          <div>
            <div>{couponName}</div>
            <div>{couponDescription}</div>
          </div>
        ) : (
          "None"
        )
      }
      Form={CouponCodeForm}
    />
  );
}
