import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;
const sql = DATABASE_URL ? postgres(DATABASE_URL, { ssl: "require" }) : null;

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  try {
    if (!sql) {
      res.status(500).json({ ok: false, error: "DATABASE_URL is not set" });
      return;
    }

    const body = req.body || {};

    const anonymousId = String(body.anonymousId || "").trim();
    const eventName = String(body.eventName || "").trim();
    const path = String(body.path || "").trim();
    const referrer = String(body.referrer || "").trim();
    const props =
      body.props && typeof body.props === "object" ? body.props : {};

    if (!anonymousId || anonymousId.length > 64) {
      res.status(400).json({ ok: false, error: "anonymousId is required" });
      return;
    }

    if (!eventName || eventName.length > 64) {
      res.status(400).json({ ok: false, error: "eventName is required" });
      return;
    }

    const ua = String(req.headers["user-agent"] || "");
    const ip = (req.headers["x-forwarded-for"] || "")
      .toString()
      .split(",")[0]
      .trim();

    await sql`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id bigserial PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        anonymous_id varchar(64) NOT NULL,
        event_name varchar(64) NOT NULL,
        path text,
        referrer text,
        ip text,
        user_agent text,
        props jsonb
      )
    `;

    await sql`
      INSERT INTO analytics_events (anonymous_id, event_name, path, referrer, ip, user_agent, props)
      VALUES (${anonymousId}, ${eventName}, ${path}, ${referrer}, ${ip}, ${ua}, ${sql.json(
      props
    )})
    `;

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
