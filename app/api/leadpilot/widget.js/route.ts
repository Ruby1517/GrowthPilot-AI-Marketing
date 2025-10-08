import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const js = `
(function(){
  try {
    var s = document.currentScript;
    var pb = (s && s.getAttribute('data-playbook')) || 'homepage';
    var src = (s && s.src) || '';
    // ORIGIN is your app's base URL (https://your-app.com)
    var ORIGIN = src.split('/api/leadpilot/widget.js')[0];
    var site = location.hostname;

    var iframe = document.createElement('iframe');
    iframe.src = ORIGIN + '/leadpilot/embed?pb=' + encodeURIComponent(pb) + '&site=' + encodeURIComponent(site);
    iframe.style.position='fixed';
    iframe.style.bottom='20px';
    iframe.style.right='20px';
    iframe.style.width='360px';
    iframe.style.height='560px';
    iframe.style.border='0';
    iframe.style.borderRadius='12px';
    iframe.style.boxShadow='0 10px 30px rgba(0,0,0,0.25)';
    iframe.style.zIndex='999999';

    // Optional: avoid double-mount if script is included twice
    if (!document.querySelector('iframe[data-leadpilot="1"]')) {
      iframe.setAttribute('data-leadpilot','1');
      document.addEventListener('DOMContentLoaded', function(){ document.body.appendChild(iframe); });
      if (document.readyState !== 'loading') { document.body.appendChild(iframe); }
    }
  } catch (e) { console && console.error('[LeadPilot] widget init error', e); }
})();
`;
  return new NextResponse(js, {
    headers: {
      "Content-Type": "application/javascript; charset=UTF-8",
      "Cache-Control": "no-store",
    },
  });
}
