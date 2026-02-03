import postgres from "postgres";
import { Parser } from "json2csv";
import { Resend } from "resend";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;
const sql = DATABASE_URL ? postgres(DATABASE_URL, { ssl: "require" }) : null;

const resendKey = process.env.RESEND_API_KEY;
const from = process.env.REPORT_FROM || "analytics@smile666.app";
const to = (process.env.REPORT_TO || "faceit.analyze@gmail.com")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export default async function handler(req, res) {
  // Security: allow only cron calls (optional)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const provided = String(req.headers["x-cron-secret"] || "");
    if (provided !== cronSecret) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }
  }

  try {
    if (!sql) {
      res.status(500).json({ ok: false, error: "DATABASE_URL is not set" });
      return;
    }

    if (!resendKey) {
      res.status(500).json({ ok: false, error: "RESEND_API_KEY is not set" });
      return;
    }

    if (!to.length) {
      res.status(500).json({ ok: false, error: "REPORT_TO is not set" });
      return;
    }

    const window = String(process.env.ANALYTICS_REPORT_WINDOW || "1d");
    const limit = Number(process.env.ANALYTICS_REPORT_LIMIT || 100000);

    // Optional: exclude sensitive columns from the CSV export
    const includeIp =
      String(process.env.ANALYTICS_REPORT_INCLUDE_IP || "1").toLowerCase() !==
      "0";
    const includeUserAgent =
      String(
        process.env.ANALYTICS_REPORT_INCLUDE_USER_AGENT || "1"
      ).toLowerCase() !== "0";

    // window: "1d" | "7d" etc
    const interval = /^\d+d$/.test(window)
      ? `${Number(window.slice(0, -1))} day`
      : "1 day";

    const rows = await sql`
      SELECT id, created_at, anonymous_id, event_name, referrer, ip, user_agent, props
      FROM analytics_events
      WHERE created_at >= now() - (${interval}::interval)
      ORDER BY created_at ASC
      LIMIT ${limit}
    `;

    const fields = [
      "id",
      "created_at",
      "anonymous_id",
      "event_name",
      "referrer",
    ];
    if (includeIp) fields.push("ip");
    if (includeUserAgent) fields.push("user_agent");
    fields.push("props");

    const parser = new Parser({ fields });

    const csv = parser.parse(
      rows.map((r) => ({
        ...r,
        ip: includeIp ? r.ip : undefined,
        user_agent: includeUserAgent ? r.user_agent : undefined,
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
