import hasha from "hasha";
import db from "db";
import { z } from "zod";
import { api } from "app/blitz-server";

const Q = z.object({
  id: z.preprocess((val) => Number(val), z.number()),
});

/**
 * https://docs.sentry.io/platforms/javascript/troubleshooting/#using-the-tunnel-option
 */
export default api(async function proxyAvatar(req, res) {
  if (req.method !== "GET") {
    res.status(400).end("GET method only");
    return;
  }

  const { id } = Q.parse(req.query);

  const { email } = await db.user.findFirstOrThrow({
    where: { id },
    select: { email: true },
  });
  const email_md5 = hasha(email, { algorithm: "md5" });
  res.redirect(`https://www.gravatar.com/avatar/${email_md5}`);
});
