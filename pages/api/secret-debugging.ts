import { api } from "app/blitz-server";
import { notifyTeam } from "integrations/notify_team";
import { handleTrialWillEnd } from "./webhook";

/**
 * To test sentry
 */
export default api(async function secretErrorTrigger(req, res) {
  if (req.query.type === "notification") {
    await notifyTeam(
      "notification sent by api",
      "this is testing that team notifications still work"
    );
    return res.send({ ok: true });
  }
  if (process.env.NODE_ENV !== "development") {
    return res.send({});
  }
  if (req.query.type === "error") {
    throw new Error("Unexpected secret error trigger");
  }
  if (req.query.type === "trial_will_end" && req.query.customer) {
    // eslint-disable-next-line
    await handleTrialWillEnd({
      customer: req.query.customer,
    } as any);
  }

  return res.send({});
});
