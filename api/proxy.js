export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://sm1le666.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { url, ...params } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const apiUrl = new URL(url);
    apiUrl.searchParams.append('api_key', process.env.API_KEY);

    Object.keys(params).forEach(key => 
      apiUrl.searchParams.append(key, params[key])
    );

    const response = await fetch(apiUrl.toString());
    
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}