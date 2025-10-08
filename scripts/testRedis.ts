import IORedis from 'ioredis'

const url = process.env.REDIS_URL || 'redis://localhost:6379'
const r = new IORedis(url, { maxRetriesPerRequest: null })

async function main() {
  await r.set('hello', 'world', 'EX', 60)
  const v = await r.get('hello')
  console.log('GET hello =', v)
  await r.quit()
}
main().catch(err => { console.error(err); process.exit(1) })

