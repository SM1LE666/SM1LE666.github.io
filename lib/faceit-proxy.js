export async function proxyFaceitJson(res, url) {
  const apiKey = process.env.FACEIT_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "FACEIT_API_KEY is not set" });
    return;
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const text = await response.text();
  res.status(response.status);
  res.setHeader("Content-Type", "application/json");
  res.send(text);
}
