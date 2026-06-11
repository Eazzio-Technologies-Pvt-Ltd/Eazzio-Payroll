require('dotenv').config();

async function test() {
  const clientId = process.env.MAPPLS_CLIENT_ID;
  const clientSecret = process.env.MAPPLS_CLIENT_SECRET;
  
  try {
    const response = await fetch('https://outpost.mappls.com/api/security/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });
    
    if (!response.ok) {
        console.error("Token fetch failed", response.status, await response.text());
        return;
    }
    const data = await response.json();

    const mapplsUrl = `https://atlas.mappls.com/api/places/search/json?query=jam`;
    const searchResponse = await fetch(mapplsUrl, {
      headers: { 'Authorization': `Bearer ${data.access_token}` }
    });
    
    const text = await searchResponse.text();
    console.log("Search status:", searchResponse.status);
    console.log("Search body:", text);
  } catch (err) {
    console.error("Test error", err);
  }
}

test();
