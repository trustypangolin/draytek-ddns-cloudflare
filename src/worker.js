/**
 * Welcome to Cloudflare Workers! This is a dynamic DNS Worker written for Draytek Modems
 *
 */

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
  });
  
  async function handleRequest(request) {
    const url = new URL(request.url);
  
    // Check if the request is for /dynamic/dns/update
    // Example call would be:
    //  https://your.worker.dev/dynamic/dns/update?zone_id=*******&record_id=*******&record_domain=somerecord.com&ip=123.123.123.123
    
    if (url.pathname === '/dynamic/dns/update' && request.method === 'GET') {
      const ip            = url.searchParams.get('ip');      // IP Address
      const zone_id       = url.searchParams.get('zone_id'); //
      const record_id     = url.searchParams.get('record_id');
      const record_domain = url.searchParams.get('record_domain');
  
      
      // Validate required parameters
      if (!zone_id || !record_id || !record_domain || !ip) {
        return new Response('Missing required parameters (zone_id, record_id, record_domain, or ip)', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
        });
      }
  
      // Extract username and password from Authorization header
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Basic ')) {
        return new Response('Authorization header is missing or invalid', {
          status: 401,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
  
      // Decode the Base64 credentials
      const base64Credentials = authHeader.split(' ')[1];
      const credentials = atob(base64Credentials); // Decode Base64
      const [username, password] = credentials.split(':');
  
      if (!username || !password) {
        return new Response('Invalid username or password', {
          status: 401,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
  
      // Log the IP address
      console.log(`Updating DNS A record with IP: ${ip} with record ${record_domain}`);
  
      // Update the DNS A record
      try {
        const result = await updateDnsRecord(username,password,zone_id,record_id,record_domain,ip);
        return new Response(`DNS A record updated successfully: ${JSON.stringify(result)}`, {
          headers: { 'Content-Type': 'text/plain' },
        });
      } catch (error) {
        return new Response(`Failed to update DNS A record: ${error.message}`, {
          status: 500,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    }
  
    // If the route is not found, return a 404 response
    return new Response('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
  
  async function updateDnsRecord(username,password,zone_id,record_id,record_domain,ip) {
    const url = `https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records/${record_id}`;
  
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'X-Auth-Email': `${username}`,
        'X-Auth-Key': `${password}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'A',
        name: record_domain,
        content: ip,
        ttl: 60, // TTL (1 = automatic)
        proxied: false, // Set to true if you want to proxy through Cloudflare
      }),
    });
  
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors[0].message || 'Failed to update DNS record');
    }
  
    return response.json();
  }