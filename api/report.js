import postgres from "postgres";
import { Parser } from "json2csv";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;
const sql = DATABASE_URL ? postgres(DATABASE_URL, { ssl: "require" }) : null;

function requireToken(req) {
  const token = process.env.REPORT_TOKEN;
  if (!token) return true; // allow if not set (dev)
  const auth = String(req.headers.authorization || "");
  if (auth.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length) === token;
  }
  if (String(req.query?.token || "") === token) return true;
  return false;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  if (!requireToken(req)) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  try {
    if (!sql) {
      res.status(500).json({ ok: false, error: "DATABASE_URL is not set" });
      return;
    }

    // Default: last 24h
    const from = String(req.query?.from || "").trim();
    const to = String(req.query?.to || "").trim();
    const fromDate = from
      ? new Date(from)
      : new Date(Date.now() - 24 * 3600 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const rows = await sql`
      SELECT id, created_at, anonymous_id, event_name, path, referrer, ip, user_agent, props
      FROM analytics_events
      WHERE created_at >= ${fromDate.toISOString()}::timestamptz
        AND created_at <= ${toDate.toISOString()}::timestamptz
      ORDER BY created_at ASC
      LIMIT 100000
    `;

    const parser = new Parser({
      fields: [
        "id",
        "created_at",
        "anonymous_id",
        "event_name",
        "path",
        "referrer",
        "ip",
        "user_agent",
        "props",
      ],
    });

    const csv = parser.parse(
      rows.map((r) => ({
        ...r,
        props: r.props ? JSON.stringify(r.props) : "",
      }))
    );

    res.status(200);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=analytics_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );
    res.send(csv);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
