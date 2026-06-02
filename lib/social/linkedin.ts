const BASE = 'https://api.linkedin.com'

export async function linkedinGetUser(accessToken: string) {
  const r = await fetch(`${BASE}/v2/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!r.ok) throw new Error(`LinkedIn userinfo failed: ${r.status}`)
  const j = await r.json()
  return {
    id:          j.sub as string,
    name:        (j.name ?? j.given_name ?? '') as string,
    username:    (j.email ?? j.sub) as string,
  }
}

export async function linkedinPublish(accessToken: string, authorUrn: string, text: string) {
  const body = {
    author:         authorUrn,
    commentary:     text,
    visibility:     'PUBLIC',
    distribution:   { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  }

  const r = await fetch(`${BASE}/rest/posts`, {
    method:  'POST',
    headers: {
      Authorization:     `Bearer ${accessToken}`,
      'Content-Type':    'application/json',
      'LinkedIn-Version': '202311',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  })

  if (!r.ok) {
    const err = await r.text()
    throw new Error(`LinkedIn publish failed (${r.status}): ${err}`)
  }

  const location = r.headers.get('x-restli-id') || r.headers.get('location') || ''
  return { postId: location }
}
