import { auth } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import Event from '@/models/Event'
export async function GET(){ const session = await auth(); if(!session?.user) return new Response('Unauthorized',{status:401}); await dbConnect(); const orgId = (session.user as any).orgId; const events = await Event.find({ orgId }).sort({ at:-1 }).limit(200); return Response.json(events) }