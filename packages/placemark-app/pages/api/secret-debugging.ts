import { api } from "app/blitz-server";
import { notifyTeam } from "integrations/notify_team";

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

  return res.send({});
});
