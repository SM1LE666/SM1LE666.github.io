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
    const {
      CONTACT_SMTP_HOST,
      CONTACT_SMTP_PORT,
      CONTACT_SMTP_USER,
      CONTACT_SMTP_PASS,
      CONTACT_SMTP_TLS,
      CONTACT_TO,
      CONTACT_FROM,
      CONTACT_SUBJECT_PREFIX,
      CONTACT_RATE_LIMIT_WINDOW_SEC,
      CONTACT_RATE_LIMIT_MAX,
    } = process.env;

    if (!CONTACT_SMTP_HOST || !CONTACT_SMTP_USER || !CONTACT_SMTP_PASS) {
      res.status(500).json({ ok: false, error: "SMTP is not configured" });
      return;
    }

    const to = CONTACT_TO || "contact@faceit-analyze.com";
    const from = CONTACT_FROM || CONTACT_SMTP_USER;
    const subjectPrefix = CONTACT_SUBJECT_PREFIX || "[Contact]";

    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim();
    const subject = String(req.body?.subject || "").trim();
    const message = String(req.body?.message || "").trim();

    if (!name || !email || !subject || !message) {
      res.status(400).json({ ok: false, error: "Missing required fields" });
      return;
    }

    if (message.length > 5000) {
      res.status(400).json({ ok: false, error: "Message is too long" });
      return;
    }

    // --- Basic in-memory rate limit (best-effort; may reset between invocations) ---
    const ip =
      (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() ||
      req.socket?.remoteAddress ||
      "unknown";

    const windowSec = Number(CONTACT_RATE_LIMIT_WINDOW_SEC || 600);
    const maxReq = Number(CONTACT_RATE_LIMIT_MAX || 5);

    globalThis.__contactRate = globalThis.__contactRate || new Map();
    const now = Date.now();
    const key = String(ip);
    const arr = (globalThis.__contactRate.get(key) || []).filter(
      (t) => now - t < windowSec * 1000
    );
    if (arr.length >= maxReq) {
      res.status(429).json({ ok: false, error: "Too many requests" });
      return;
    }
    arr.push(now);
    globalThis.__contactRate.set(key, arr);

    const nodemailer = await import("nodemailer");

    const port = Number(CONTACT_SMTP_PORT || 587);
    const tls = (CONTACT_SMTP_TLS || "true").toLowerCase();
    const useSecure = port === 465; // implicit TLS

    const transporter = nodemailer.createTransport({
      host: CONTACT_SMTP_HOST,
      port,
      secure: useSecure,
      auth: {
        user: CONTACT_SMTP_USER,
        pass: CONTACT_SMTP_PASS,
      },
      tls: {
        // If CONTACT_SMTP_TLS=false, user likely wants plaintext (rare). Nodemailer
        // will still negotiate STARTTLS by default when available; to force disable:
        rejectUnauthorized: tls !== "false",
      },
    });

    await transporter.sendMail({
      to,
      from,
      replyTo: email,
      subject: `${subjectPrefix} [${subject}] from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}\n\nIP: ${ip}`,
    });

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
