import postgres from "postgres";
import { Parser } from "json2csv";
import { Resend } from "resend";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;
const sql = DATABASE_URL ? postgres(DATABASE_URL, { ssl: "require" }) : null;

function unauthorized(res) {
  res.status(401).json({ ok: false, error: "Unauthorized" });
}

export default async function handler(req, res) {
  // Vercel Cron sends GET
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  // Protect cron endpoint
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = String(req.headers.authorization || "");
    const q = String(req.query?.secret || "");
    const ok = auth === `Bearer ${secret}` || q === secret;
    if (!ok) return unauthorized(res);
  }

  if (!sql) {
    res.status(500).json({ ok: false, error: "DATABASE_URL is not set" });
    return;
  }

  const resendKey = process.env.RESEND_API_KEY;
  const to = process.env.ANALYTICS_REPORT_TO;
  const from = process.env.ANALYTICS_REPORT_FROM;

  if (!resendKey || !to || !from) {
    res
      .status(500)
      .json({ ok: false, error: "Resend email is not configured" });
    return;
  }

  const window = String(process.env.ANALYTICS_REPORT_WINDOW || "1d");
  const limit = Number(process.env.ANALYTICS_REPORT_LIMIT || 100000);

  // window: "1d" | "7d" etc
  const interval = /^\d+d$/.test(window)
    ? `${Number(window.slice(0, -1))} day`
    : "1 day";

  try {
    const { rows } = await sql`
      SELECT id, created_at, anonymous_id, event_name, path, referrer, ip, user_agent, props
      FROM analytics_events
      WHERE created_at >= now() - (${interval}::interval)
      ORDER BY created_at ASC
      LIMIT ${limit}
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

    const date = new Date().toISOString().slice(0, 10);
    const resend = new Resend(resendKey);

    const subject = `Analytics report (${window}) - ${date}`;

    await resend.emails.send({
      from,
      to,
      subject,
      text: `Attached is the analytics CSV report for the last ${window}. Total rows: ${rows.length}.`,
      attachments: [
        {
          filename: `analytics_${window}_${date}.csv`,
          content: Buffer.from(csv, "utf-8").toString("base64"),
        },
      ],
    });

    res.status(200).json({ ok: true, rows: rows.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
