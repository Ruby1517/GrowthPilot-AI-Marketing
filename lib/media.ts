export async function searchClips(query: string, count=6): Promise<string[]> {
  const headers = { Authorization: process.env.PEXELS_API_KEY! };
  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`;
  const r = await fetch(url, { headers });
  const j = await r.json();
  const vids = j?.videos || [];
  return vids.map((v:any)=>{
    const file = (v.video_files || []).sort((a:any,b:any)=> (b.width||0)-(a.width||0))[0];
    return file?.link;
  }).filter(Boolean);
}
