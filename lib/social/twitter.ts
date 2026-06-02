const BASE = 'https://api.twitter.com'

export async function twitterGetUser(accessToken: string) {
  const r = await fetch(`${BASE}/2/users/me?user.fields=username,name`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!r.ok) throw new Error(`Twitter /users/me failed: ${r.status}`)
  const j = await r.json()
  return {
    id:       j.data.id as string,
    name:     j.data.name as string,
    username: j.data.username as string,
  }
}

export async function twitterPublish(accessToken: string, text: string) {
  const tweet = text.length > 280 ? text.slice(0, 277) + '…' : text

  const r = await fetch(`${BASE}/2/tweets`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: tweet }),
  })

  if (!r.ok) {
    const err = await r.text()
    throw new Error(`Twitter publish failed (${r.status}): ${err}`)
  }

  const j = await r.json()
  return { tweetId: j.data?.id }
}

// Build tweet text from caption + hashtags, respecting 280 char limit
export function buildTweetText(caption: string, hashtags: string[]): string {
  const tags = hashtags.slice(0, 3).map(h => `#${h}`).join(' ')
  const combined = tags ? `${caption}\n\n${tags}` : caption
  return combined.length <= 280 ? combined : caption.slice(0, 277 - (tags ? tags.length + 2 : 0)) + '…' + (tags ? `\n\n${tags}` : '')
}
