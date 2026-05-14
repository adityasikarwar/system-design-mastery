import { DARK, LIGHT } from "./theme";

// Diagram components read this module-local palette lazily at render time.
// App calls setDiagramTheme() each render to keep it in sync with the active theme.
let C = DARK;
export const setDiagramTheme = (isDark: boolean) => { C = isDark ? DARK : LIGHT; };

// ─── SVG primitives for architecture diagrams ───
const B = ({ x, y, w = 68, h = 22, label, color = C.blue, sub, multi }: any) => (
  <g>
    {multi && <rect x={x + 2} y={y + 2} width={w} height={h} rx={4} fill={color} opacity="0.08" stroke={color} strokeOpacity="0.15" />}
    <rect x={x} y={y} width={w} height={h} rx={4} fill={color} fillOpacity="0.06" stroke={color} strokeWidth="0.8" />
    <text x={x + w / 2} y={sub ? y + h / 2 + 1 : y + h / 2 + 3} textAnchor="middle" fill={color} fontSize="7" fontWeight="700" fontFamily="'DM Sans', sans-serif">{label}</text>
    {sub && <text x={x + w / 2} y={y + h / 2 + 9} textAnchor="middle" fill={color} opacity="0.5" fontSize="5" fontFamily="'DM Sans'">{sub}</text>}
  </g>
);
const DB = ({ x, y, w = 54, h = 22, label, color = C.green }: any) => (
  <g>
    <ellipse cx={x + w / 2} cy={y + 3} rx={w / 2} ry={3} fill={color} fillOpacity="0.08" stroke={color} strokeWidth="0.8" />
    <rect x={x} y={y + 3} width={w} height={h - 6} fill={color} fillOpacity="0.04" />
    <line x1={x} y1={y + 3} x2={x} y2={y + h - 3} stroke={color} strokeWidth="0.8" />
    <line x1={x + w} y1={y + 3} x2={x + w} y2={y + h - 3} stroke={color} strokeWidth="0.8" />
    <ellipse cx={x + w / 2} cy={y + h - 3} rx={w / 2} ry={3} fill={color} fillOpacity="0.06" stroke={color} strokeWidth="0.8" />
    <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle" fill={color} fontSize="6" fontWeight="600" fontFamily="'DM Sans'">{label}</text>
  </g>
);
const CL = ({ x, y, label, color = C.purple }: any) => (
  <g>
    <ellipse cx={x + 27} cy={y + 11} rx={26} ry={10} fill={color} fillOpacity="0.04" stroke={color} strokeWidth="0.8" strokeDasharray="3 2" />
    <text x={x + 27} y={y + 14} textAnchor="middle" fill={color} fontSize="6" fontWeight="600" fontFamily="'DM Sans'">{label}</text>
  </g>
);
const U = ({ x, y, label = "User", color = C.orange }: any) => (
  <g>
    <circle cx={x + 10} cy={y + 5} r={5} fill={color} fillOpacity="0.1" stroke={color} strokeWidth="0.8" />
    <path d={`M ${x + 2} ${y + 18} Q ${x + 10} ${y + 12} ${x + 18} ${y + 18} L ${x + 18} ${y + 21} L ${x + 2} ${y + 21} Z`} fill={color} fillOpacity="0.1" stroke={color} strokeWidth="0.8" />
    <text x={x + 10} y={y + 30} textAnchor="middle" fill={color} fontSize="6" fontWeight="600" fontFamily="'DM Sans'">{label}</text>
  </g>
);
const A = ({ x1, y1, x2, y2, label, color = "#4b5563", dashed }: any) => {
  const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len, uy = dy / len, ex = x2 - ux * 3, ey = y2 - uy * 3;
  const px = -uy * 2.5, py = ux * 2.5;
  const isVert = Math.abs(dy) > Math.abs(dx);
  const lx = (x1 + x2) / 2 + (isVert ? 16 : 0);
  const ly = (y1 + y2) / 2 + (isVert ? 1 : -4);
  return (
    <g>
      <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={color} strokeWidth="0.7" strokeDasharray={dashed ? "3 2" : "none"} opacity="0.5" />
      <polygon points={`${x2},${y2} ${ex + px},${ey + py} ${ex - px},${ey - py}`} fill={color} opacity="0.5" />
      {label && <text x={lx} y={ly} textAnchor="middle" fill={color} fontSize="5" fontWeight="600" fontFamily="'IBM Plex Mono'" opacity="0.7">{label}</text>}
    </g>
  );
};
const LY = ({ x, y, w, h, label, color = C.dim }: any) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={6} fill={color} fillOpacity="0.015" stroke={color} strokeWidth="0.5" strokeDasharray="4 3" opacity="0.25" />
    <text x={x + 6} y={y + 9} fill={color} fontSize="5" fontFamily="'IBM Plex Mono'" fontWeight="600" letterSpacing="1" opacity="0.4">{label.toUpperCase()}</text>
  </g>
);
const Note = ({ x, y, text, color = C.dim }: any) => (
  <text x={x} y={y} textAnchor="middle" fill={color} fontSize="5.5" fontFamily="'DM Sans'" fontStyle="italic" opacity="0.5">{text}</text>
);

// ─── Architecture Diagrams (compact grid layouts) ───
const DiagTwitter = () => (
  <svg viewBox="0 0 340 200" style={{ width: "100%", height: "auto" }}>
    <LY x={70} y={2} w={268} h={182} label="Backend" />
    <U x={5} y={15} label="Write" />
    <U x={5} y={130} label="Read" color={C.cyan} />
    <B x={78} y={40} w={58} label="API GW" color={C.accent} />
    <A x1={28} y1={30} x2={78} y2={48} />
    <A x1={28} y1={145} x2={78} y2={56} />
    <B x={155} y={10} label="Tweet Svc" color={C.blue} />
    <B x={155} y={45} label="Fan-out" color={C.purple} />
    <B x={155} y={110} label="Feed Svc" color={C.pink} />
    <B x={155} y={145} label="Search" color={C.cyan} />
    <A x1={136} y1={47} x2={155} y2={21} label="write" />
    <A x1={136} y1={53} x2={155} y2={56} />
    <A x1={136} y1={58} x2={155} y2={121} label="read" />
    <A x1={190} y1={32} x2={190} y2={45} />
    <A x1={190} y1={67} x2={190} y2={110} dashed label="push" />
    <DB x={248} y={7} label="Tweets DB" color={C.green} />
    <DB x={248} y={42} label="Kafka" color={C.green} />
    <DB x={248} y={107} label="Redis" color={C.red} />
    <DB x={248} y={142} label="ES Index" color={C.cyan} />
    <A x1={223} y1={21} x2={248} y2={16} />
    <A x1={223} y1={56} x2={248} y2={51} />
    <A x1={223} y1={121} x2={248} y2={116} />
    <A x1={223} y1={156} x2={248} y2={151} />
    <Note x={170} y={195} text="Fan-out on write for normal users, pull for celebrities (hybrid)" />
  </svg>
);

const DiagInstagram = () => (
  <svg viewBox="0 0 340 195" style={{ width: "100%", height: "auto" }}>
    <U x={5} y={10} label="Upload" />
    <U x={5} y={115} label="Browse" color={C.cyan} />
    <B x={75} y={15} w={58} label="Upload" color={C.accent} />
    <A x1={28} y1={25} x2={75} y2={24} />
    <CL x={148} y={10} label="S3" color={C.purple} />
    <A x1={133} y1={24} x2={150} y2={20} label="presign" />
    <B x={218} y={12} label="Transcode" color={C.green} />
    <A x1={200} y1={20} x2={218} y2={22} />
    <CL x={218} y={42} label="CDN" color={C.cyan} />
    <A x1={252} y1={34} x2={252} y2={42} />
    <B x={75} y={65} label="Post Svc" color={C.blue} />
    <B x={75} y={100} label="Feed Svc" color={C.pink} />
    <B x={75} y={135} label="Like/Cmt" color={C.purple} />
    <A x1={28} y1={130} x2={75} y2={111} label="feed" />
    <DB x={170} y={62} label="Posts DB" color={C.green} />
    <DB x={170} y={97} label="Redis" color={C.red} />
    <DB x={170} y={132} label="Cassandra" color={C.green} />
    <A x1={143} y1={76} x2={170} y2={71} />
    <A x1={143} y1={111} x2={170} y2={106} />
    <A x1={143} y1={146} x2={170} y2={141} />
    <Note x={170} y={188} text="Presigned URL → S3 upload → resize → CDN" />
  </svg>
);

const DiagWhatsApp = () => (
  <svg viewBox="0 0 340 190" style={{ width: "100%", height: "auto" }}>
    <U x={5} y={10} label="Alice" />
    <U x={5} y={120} label="Bob" color={C.cyan} />
    <B x={62} y={15} w={60} label="WS GW" color={C.accent} />
    <B x={62} y={125} w={60} label="WS GW" color={C.accent} />
    <A x1={28} y1={25} x2={62} y2={24} label="WSS" />
    <A x1={28} y1={135} x2={62} y2={134} label="WSS" />
    <B x={142} y={62} w={70} label="Chat Svc" color={C.blue} />
    <A x1={122} y1={28} x2={165} y2={62} />
    <A x1={165} y1={84} x2={122} y2={128} dashed label="push" />
    <DB x={235} y={10} label="Users" color={C.green} />
    <DB x={235} y={45} label="Messages" color={C.green} />
    <DB x={235} y={80} label="Presence" color={C.red} />
    <A x1={212} y1={68} x2={235} y2={19} />
    <A x1={212} y1={73} x2={235} y2={54} />
    <A x1={212} y1={78} x2={235} y2={89} />
    <B x={142} y={125} w={70} label="Notif Svc" color={C.purple} />
    <A x1={177} y1={84} x2={177} y2={125} />
    <CL x={235} y={122} label="APNS/FCM" color={C.pink} />
    <A x1={212} y1={136} x2={237} y2={132} />
    <Note x={170} y={183} text="E2E encrypted · Cassandra for messages · Redis presence TTL" />
  </svg>
);

const DiagYouTube = () => (
  <svg viewBox="0 0 340 200" style={{ width: "100%", height: "auto" }}>
    <U x={5} y={8} label="Creator" />
    <U x={5} y={135} label="Viewer" color={C.cyan} />
    <B x={68} y={13} label="Upload API" color={C.accent} />
    <A x1={28} y1={23} x2={68} y2={22} />
    <CL x={152} y={8} label="Raw S3" color={C.purple} />
    <A x1={136} y1={22} x2={154} y2={17} />
    <B x={218} y={10} label="Transcode" color={C.green} />
    <A x1={204} y1={17} x2={218} y2={20} label="process" />
    <CL x={218} y={40} label="CDN" color={C.cyan} />
    <A x1={252} y1={32} x2={252} y2={40} />
    <DB x={152} y={45} label="Metadata" color={C.green} />
    <A x1={102} y1={35} x2={179} y2={45} dashed />
    <LY x={58} y={78} w={275} h={42} label="Platform" />
    <B x={65} y={88} w={58} label="Video" color={C.blue} />
    <B x={133} y={88} w={58} label="Search" color={C.cyan} />
    <B x={201} y={88} w={58} label="Recs" color={C.pink} />
    <B x={269} y={88} w={55} label="Ads" color={C.orange} />
    <CL x={148} y={140} label="CDN Edge" color={C.cyan} />
    <A x1={28} y1={150} x2={150} y2={150} />
    <A x1={252} y1={56} x2={200} y2={140} dashed label="serve" />
    <Note x={170} y={193} text="Upload → transcode → CDN · adaptive bitrate (HLS/DASH)" />
  </svg>
);

const DiagUber = () => (
  <svg viewBox="0 0 340 190" style={{ width: "100%", height: "auto" }}>
    <U x={5} y={10} label="Rider" />
    <U x={5} y={120} label="Driver" color={C.green} />
    <B x={62} y={15} w={58} label="API GW" color={C.accent} />
    <A x1={28} y1={25} x2={62} y2={24} />
    <A x1={28} y1={135} x2={62} y2={32} dashed label="loc" />
    <B x={140} y={8} label="Ride Svc" color={C.blue} />
    <B x={140} y={42} label="Matching" color={C.purple} />
    <B x={140} y={76} label="Location" color={C.pink} />
    <B x={140} y={110} label="Payment" color={C.red} />
    <A x1={120} y1={24} x2={140} y2={19} />
    <A x1={174} y1={30} x2={174} y2={42} />
    <A x1={174} y1={64} x2={174} y2={76} label="nearby" />
    <A x1={174} y1={98} x2={174} y2={110} />
    <DB x={238} y={5} label="Rides DB" color={C.green} />
    <DB x={238} y={39} label="GeoHash" color={C.cyan} />
    <DB x={238} y={73} label="Redis Loc" color={C.red} />
    <DB x={238} y={107} label="Stripe" color={C.orange} />
    <A x1={208} y1={19} x2={238} y2={14} />
    <A x1={208} y1={53} x2={238} y2={48} />
    <A x1={208} y1={87} x2={238} y2={82} />
    <A x1={208} y1={121} x2={238} y2={116} />
    <Note x={170} y={183} text="Driver pings every 3s → GeoHash grid → match nearest" />
  </svg>
);

const DiagURL = () => (
  <svg viewBox="0 0 340 175" style={{ width: "100%", height: "auto" }}>
    <text x={170} y={9} textAnchor="middle" fill={C.cyan} fontSize="6" fontWeight="700" fontFamily="'Outfit'" letterSpacing="1.5">REDIRECT (GET /{`code`})</text>
    <U x={5} y={16} label="User" />
    <B x={62} y={21} w={60} label="Load Bal" color={C.accent} />
    <A x1={28} y1={31} x2={62} y2={30} />
    <B x={140} y={21} label="App Server" color={C.blue} multi />
    <A x1={122} y1={30} x2={140} y2={30} />
    <DB x={228} y={18} label="Redis" color={C.red} />
    <A x1={208} y1={30} x2={228} y2={27} label="1.check" />
    <DB x={228} y={50} label="URLs DB" color={C.green} />
    <A x1={255} y1={40} x2={255} y2={50} dashed label="2.miss" />
    <line x1={15} y1={82} x2={325} y2={82} stroke={C.border} strokeDasharray="4 3" opacity="0.2" />
    <text x={170} y={93} textAnchor="middle" fill={C.accent} fontSize="6" fontWeight="700" fontFamily="'Outfit'" letterSpacing="1.5">SHORTEN (POST /shorten)</text>
    <U x={5} y={100} label="Shorten" color={C.cyan} />
    <B x={62} y={105} label="App Server" color={C.blue} />
    <A x1={28} y1={115} x2={62} y2={114} />
    <B x={150} y={100} label="ID Gen" color={C.purple} sub="Snowflake" />
    <A x1={130} y1={110} x2={150} y2={108} label="1.ID" />
    <B x={150} y={132} label="Base62" color={C.pink} />
    <A x1={184} y1={122} x2={184} y2={132} label="2.enc" />
    <DB x={250} y={112} label="URLs Tbl" color={C.green} />
    <A x1={218} y1={143} x2={250} y2={125} label="3.save" />
    <Note x={170} y={170} text="tinyurl.com/abc → 301 redirect · Base62: 6 chars = 56B URLs" />
  </svg>
);

const DiagGDocs = () => (
  <svg viewBox="0 0 340 170" style={{ width: "100%", height: "auto" }}>
    <U x={5} y={5} label="User A" />
    <U x={5} y={60} label="User B" color={C.green} />
    <U x={5} y={115} label="User C" color={C.purple} />
    <B x={62} y={48} w={62} h={30} label="WS Hub" color={C.accent} sub="sticky" />
    <A x1={28} y1={20} x2={62} y2={55} label="WSS" />
    <A x1={28} y1={75} x2={62} y2={63} label="WSS" />
    <A x1={28} y1={130} x2={62} y2={72} label="WSS" />
    <B x={148} y={48} w={72} h={30} label="OT/CRDT" color={C.purple} />
    <A x1={124} y1={60} x2={148} y2={60} label="ops" />
    <A x1={148} y1={66} x2={124} y2={66} dashed label="bcast" />
    <DB x={248} y={12} label="Snapshots" color={C.green} />
    <DB x={248} y={50} label="Op Log" color={C.cyan} />
    <DB x={248} y={92} label="Blobs" color={C.purple} />
    <A x1={220} y1={55} x2={248} y2={21} dashed label="save" />
    <A x1={220} y1={66} x2={248} y2={59} label="append" />
    <A x1={220} y1={73} x2={248} y2={101} dashed />
    <Note x={170} y={163} text="OT transforms concurrent edits → all clients converge" />
  </svg>
);

const DiagRate = () => (
  <svg viewBox="0 0 340 160" style={{ width: "100%", height: "auto" }}>
    <U x={5} y={15} label="Client" />
    <B x={62} y={20} w={60} label="API GW" color={C.accent} />
    <A x1={28} y1={30} x2={62} y2={29} />
    <B x={142} y={15} w={72} h={28} label="Rate Limit" color={C.blue} sub="Token Bucket" />
    <A x1={122} y1={29} x2={142} y2={28} label="check" />
    <DB x={238} y={18} label="Redis" color={C.red} />
    <A x1={214} y1={29} x2={238} y2={27} label="INCR" />
    <B x={105} y={82} label="✓ Pass" color={C.green} />
    <A x1={170} y1={43} x2={139} y2={82} label="≤ limit" color={C.green} />
    <B x={195} y={82} label="429 Reject" color={C.red} />
    <A x1={185} y1={43} x2={220} y2={82} label="> limit" color={C.red} />
    <B x={105} y={115} label="Backend" color={C.purple} />
    <A x1={139} y1={104} x2={139} y2={115} />
    <Note x={170} y={155} text="Key: user_id or IP · token bucket allows bursts · Lua atomicity" />
  </svg>
);

const DiagNotif = () => (
  <svg viewBox="0 0 340 170" style={{ width: "100%", height: "auto" }}>
    <B x={5} y={15} w={60} label="App Svc" color={C.orange} />
    <B x={5} y={48} w={60} label="Auth Svc" color={C.orange} />
    <B x={5} y={81} w={60} label="Cron" color={C.orange} />
    <B x={85} y={42} w={72} h={28} label="Notif Svc" color={C.accent} sub="priority" />
    <A x1={65} y1={26} x2={85} y2={50} label="send" />
    <A x1={65} y1={59} x2={85} y2={56} />
    <A x1={65} y1={92} x2={85} y2={64} />
    <DB x={178} y={42} label="Kafka" color={C.green} />
    <A x1={157} y1={56} x2={178} y2={51} label="enqueue" />
    <B x={252} y={12} label="Push" color={C.blue} />
    <B x={252} y={48} label="Email" color={C.purple} />
    <B x={252} y={84} label="SMS" color={C.pink} />
    <A x1={232} y1={48} x2={252} y2={23} dashed />
    <A x1={232} y1={53} x2={252} y2={59} dashed />
    <A x1={232} y1={60} x2={252} y2={95} dashed />
    <CL x={135} y={120} label="APNS/FCM" color={C.cyan} />
    <CL x={218} y={120} label="SendGrid" color={C.purple} />
    <A x1={286} y1={34} x2={175} y2={120} dashed />
    <A x1={286} y1={70} x2={252} y2={120} dashed />
    <Note x={170} y={163} text="Kafka decouples producers → per-channel retries + DLQ" />
  </svg>
);

const DiagDropbox = () => (
  <svg viewBox="0 0 340 185" style={{ width: "100%", height: "auto" }}>
    <U x={5} y={5} label="Laptop" />
    <U x={5} y={95} label="Phone" color={C.cyan} />
    <B x={60} y={10} label="Sync Agent" color={C.orange} />
    <B x={60} y={100} label="Sync Agent" color={C.cyan} />
    <A x1={28} y1={20} x2={60} y2={19} />
    <A x1={28} y1={110} x2={60} y2={109} />
    <B x={148} y={48} w={62} h={28} label="API GW" color={C.accent} />
    <A x1={128} y1={22} x2={158} y2={48} />
    <A x1={128} y1={109} x2={158} y2={76} />
    <B x={238} y={8} label="Meta Svc" color={C.blue} />
    <B x={238} y={38} label="Block Svc" color={C.purple} />
    <B x={238} y={68} label="Notif WS" color={C.pink} />
    <B x={238} y={98} label="Sharing" color={C.green} />
    <A x1={210} y1={55} x2={238} y2={19} />
    <A x1={210} y1={59} x2={238} y2={49} />
    <A x1={210} y1={66} x2={238} y2={79} />
    <A x1={210} y1={70} x2={238} y2={109} />
    <DB x={80} y={145} w={50} label="Meta" color={C.green} />
    <DB x={155} y={145} w={50} label="Blocks" color={C.red} />
    <DB x={235} y={145} w={55} label="S3" color={C.purple} />
    <A x1={272} y1={49} x2={262} y2={145} dashed />
    <Note x={170} y={180} text="4MB chunks · delta sync · dedup via SHA-256 hash" />
  </svg>
);

const DiagLLMChat = () => (
  <svg viewBox="0 0 340 190" style={{ width: "100%", height: "auto" }}>
    <U x={5} y={15} label="User" />
    <B x={60} y={20} w={58} label="API GW" color={C.accent} />
    <A x1={28} y1={30} x2={60} y2={29} label="prompt" />
    <B x={140} y={20} label="Chat Svc" color={C.blue} />
    <A x1={118} y1={29} x2={140} y2={29} />
    <DB x={240} y={17} label="History" color={C.green} />
    <A x1={208} y1={29} x2={240} y2={26} label="load" />
    <B x={140} y={58} label="Context" color={C.purple} />
    <A x1={174} y1={42} x2={174} y2={58} />
    <B x={140} y={96} label="Inf Queue" color={C.cyan} />
    <A x1={174} y1={80} x2={174} y2={96} label="batch" />
    <B x={50} y={96} label="GPU" color={C.pink} />
    <A x1={140} y1={107} x2={118} y2={107} />
    <B x={50} y={134} label="Streamer" color={C.accent} />
    <A x1={84} y1={118} x2={84} y2={134} />
    <A x1={80} y1={148} x2={28} y2={42} dashed label="SSE" color={C.accent} />
    <DB x={240} y={93} label="Models" color={C.purple} />
    <A x1={240} y1={107} x2={118} y2={107} dashed />
    <Note x={170} y={183} text="Continuous GPU batching · stream tokens via SSE/WebSocket" />
  </svg>
);

const DiagRAG = () => (
  <svg viewBox="0 0 340 195" style={{ width: "100%", height: "auto" }}>
    <text x={170} y={9} textAnchor="middle" fill={C.accent} fontSize="6" fontWeight="700" fontFamily="'Outfit'" letterSpacing="1.5">INDEXING (OFFLINE)</text>
    <DB x={8} y={17} label="Docs" color={C.green} />
    <B x={82} y={17} label="Chunker" color={C.blue} />
    <A x1={62} y1={26} x2={82} y2={26} />
    <B x={168} y={17} label="Embed" color={C.purple} />
    <A x1={150} y1={26} x2={168} y2={26} label="chunks" />
    <DB x={258} y={14} label="Vector DB" color={C.pink} />
    <A x1={236} y1={26} x2={258} y2={23} label="vectors" />
    <line x1={8} y1={50} x2={332} y2={50} stroke={C.border} strokeDasharray="4 3" opacity="0.2" />
    <text x={170} y={62} textAnchor="middle" fill={C.cyan} fontSize="6" fontWeight="700" fontFamily="'Outfit'" letterSpacing="1.5">QUERY (ONLINE)</text>
    <U x={5} y={68} label="User" />
    <B x={62} y={73} label="Chat API" color={C.orange} />
    <A x1={28} y1={83} x2={62} y2={82} />
    <B x={148} y={73} label="Embed Q" color={C.purple} />
    <A x1={130} y1={82} x2={148} y2={82} />
    <B x={238} y={73} label="Similarity" color={C.pink} />
    <A x1={216} y1={82} x2={238} y2={82} label="vector" />
    <A x1={285} y1={36} x2={285} y2={73} dashed label="search" />
    <B x={148} y={118} label="Prompt" color={C.accent} sub="q + context" />
    <A x1={270} y1={95} x2={200} y2={118} label="top-k" />
    <A x1={95} y1={95} x2={162} y2={118} dashed label="question" />
    <B x={148} y={158} label="LLM" color={C.blue} />
    <A x1={182} y1={140} x2={182} y2={158} />
    <A x1={148} y1={169} x2={62} y2={95} dashed label="answer" color={C.accent} />
    <Note x={170} y={192} text="Grounds LLM in your data · reduces hallucinations" />
  </svg>
);

const DiagImageGen = () => (
  <svg viewBox="0 0 340 195" style={{ width: "100%", height: "auto" }}>
    <U x={5} y={8} label="User" />
    <B x={62} y={13} label="API GW" color={C.accent} />
    <A x1={28} y1={23} x2={62} y2={22} label="prompt" />
    <B x={152} y={13} label="Safety" color={C.red} />
    <A x1={130} y1={22} x2={152} y2={22} label="check" />
    <DB x={248} y={10} label="Banned" color={C.red} />
    <A x1={220} y1={22} x2={248} y2={19} dashed />
    <B x={102} y={50} label="Job Queue" color={C.green} />
    <A x1={182} y1={35} x2={136} y2={50} label="enqueue" />
    <B x={102} y={88} label="Encoder" color={C.purple} />
    <A x1={136} y1={72} x2={136} y2={88} />
    <B x={102} y={126} w={72} h={28} label="Diffusion" color={C.pink} sub="GPU worker" />
    <A x1={136} y1={110} x2={136} y2={126} label="embed" />
    <B x={205} y={126} label="NSFW?" color={C.red} />
    <A x1={174} y1={140} x2={205} y2={140} />
    <CL x={205} y={163} label="S3/CDN" color={C.purple} />
    <A x1={239} y1={148} x2={239} y2={163} />
    <A x1={207} y1={173} x2={28} y2={35} dashed label="URL" color={C.accent} />
    <Note x={170} y={192} text="Async job · poll/WS for progress · 5-30s generation" />
  </svg>
);

const DiagRecSys = () => (
  <svg viewBox="0 0 340 195" style={{ width: "100%", height: "auto" }}>
    <text x={170} y={9} textAnchor="middle" fill={C.accent} fontSize="6" fontWeight="700" fontFamily="'Outfit'" letterSpacing="1.5">TRAINING (BATCH)</text>
    <DB x={8} y={17} label="Events" color={C.green} />
    <B x={82} y={17} label="Features" color={C.blue} />
    <A x1={62} y1={26} x2={82} y2={26} />
    <B x={168} y={17} label="Training" color={C.purple} />
    <A x1={150} y1={26} x2={168} y2={26} />
    <DB x={258} y={14} label="Models" color={C.pink} />
    <A x1={236} y1={26} x2={258} y2={23} />
    <line x1={8} y1={50} x2={332} y2={50} stroke={C.border} strokeDasharray="4 3" opacity="0.2" />
    <text x={170} y={62} textAnchor="middle" fill={C.cyan} fontSize="6" fontWeight="700" fontFamily="'Outfit'" letterSpacing="1.5">SERVING (REAL-TIME)</text>
    <U x={5} y={68} label="User" />
    <B x={62} y={73} label="Rec Svc" color={C.accent} />
    <A x1={28} y1={83} x2={62} y2={82} />
    <B x={152} y={68} label="Candidates" color={C.blue} />
    <A x1={130} y1={82} x2={152} y2={79} label="retrieve" />
    <B x={152} y={100} label="Ranker" color={C.purple} />
    <A x1={186} y1={90} x2={186} y2={100} />
    <B x={152} y={132} label="Re-rank" color={C.pink} />
    <A x1={186} y1={122} x2={186} y2={132} />
    <A x1={152} y1={143} x2={95} y2={95} dashed label="top 10" color={C.accent} />
    <DB x={258} y={65} label="Features" color={C.green} />
    <DB x={258} y={97} label="Cache" color={C.red} />
    <DB x={258} y={129} label="History" color={C.cyan} />
    <A x1={220} y1={79} x2={258} y2={74} dashed />
    <A x1={220} y1={111} x2={258} y2={106} dashed />
    <A x1={220} y1={143} x2={258} y2={138} dashed />
    <Note x={170} y={190} text="Retrieve 1000s → rank top 10 · A/B test · logs → retrain" />
  </svg>
);

const DiagAIAgent = () => (
  <svg viewBox="0 0 340 185" style={{ width: "100%", height: "auto" }}>
    <U x={5} y={50} label="User" />
    <B x={55} y={55} label="Chat UI" color={C.orange} />
    <A x1={28} y1={65} x2={55} y2={64} label="task" />
    <B x={140} y={52} w={72} h={28} label="Agent Loop" color={C.accent} sub="max N iter" />
    <A x1={123} y1={64} x2={140} y2={63} />
    <B x={240} y={10} label="LLM Plan" color={C.purple} />
    <A x1={212} y1={52} x2={258} y2={32} label="1.think" />
    <A x1={258} y1={32} x2={212} y2={60} dashed label="action" />
    <B x={240} y={48} label="Router" color={C.blue} />
    <A x1={212} y1={68} x2={240} y2={59} label="2.exec" />
    <B x={240} y={82} w={42} h={18} label="Search" color={C.green} />
    <B x={290} y={82} w={42} h={18} label="Code" color={C.cyan} />
    <B x={240} y={106} w={42} h={18} label="DB" color={C.red} />
    <B x={290} y={106} w={42} h={18} label="APIs" color={C.pink} />
    <A x1={261} y1={70} x2={261} y2={82} />
    <B x={140} y={125} label="Observe" color={C.pink} />
    <A x1={240} y1={124} x2={195} y2={125} dashed label="result" />
    <A x1={176} y1={125} x2={212} y2={80} dashed label="3.loop" color={C.accent} />
    <DB x={55} y={125} label="Memory" color={C.green} />
    <A x1={140} y1={136} x2={109} y2={134} dashed />
    <A x1={140} y1={66} x2={55} y2={72} dashed label="final" color={C.accent} />
    <Note x={170} y={180} text="ReAct: reason → act → observe → repeat until done" />
  </svg>
);

export const FLOWS = [
  { id: "url", n: "URL Shortener", i: "🔗", d: "Easy", D: DiagURL, w: [
    { q: "Why Base62?", a: "6 chars = 62^6 = 56B URLs. Short, URL-safe. No special characters unlike Base64." },
    { q: "Why cache?", a: "80% of reads hit top 20% URLs (Pareto). Cache-aside with Redis saves DB calls. TTL = 24h, LRU eviction." },
    { q: "Why NOT MD5?", a: "MD5 produces 128 bits — must truncate → collisions. Counter-based IDs guarantee uniqueness without retries." },
    { q: "Estimation?", a: "100M URLs/month → ~40 writes/sec, 400 reads/sec (10:1 ratio). 100M × 500B = 50GB/year. Fits single DB for years." },
    { q: "API Design?", a: "POST /api/shorten {long_url} → {short_url, code}. GET /{code} → 301 redirect. 301 = cacheable, 302 = trackable." },
    { q: "Data Model?", a: "Table: urls(id BIGINT PK, code VARCHAR(7) UNIQUE INDEX, long_url TEXT, created_at, expires_at, click_count)." },
    { q: "How to scale?", a: "Read replicas for GET. Range-based ID partitioning. Cache popular codes in Redis. CDN for 301 redirects at edge." },
    { q: "Analytics?", a: "Async: log clicks to Kafka → batch into analytics DB. Track by country (GeoIP), device, referrer, time." } ]},
  { id: "rate", n: "Rate Limiter", i: "🚦", d: "Easy", D: DiagRate, w: [
    { q: "Why Redis?", a: "Atomic INCR + EXPIRE in one op. Sub-ms latency. Shared state across multiple API gateway instances." },
    { q: "Token Bucket?", a: "Bucket holds N tokens, refills at R/sec. Each request takes 1 token. Allows bursts up to N. Amazon and Stripe use this." },
    { q: "Sliding Window?", a: "Weighted: current_window_count × overlap% + prev_window_count. More accurate than fixed window, less memory than log." },
    { q: "Where to run?", a: "API Gateway layer — blocks bad traffic BEFORE hitting backend. Can also run per-service for internal rate limiting." },
    { q: "Key design?", a: "Key = user_id or IP or API_key. Support multiple rules: 100/min per user AND 1000/hr per user AND 10K/day per IP." },
    { q: "Distributed?", a: "Central Redis for exact counts. OR local counters + periodic sync (slightly over-limit but faster). Race condition: use Lua scripts." },
    { q: "What about 429?", a: "Return 429 Too Many Requests with Retry-After header. Include X-RateLimit-Remaining, X-RateLimit-Reset headers." } ]},
  { id: "notif", n: "Notifications", i: "📬", d: "Easy", D: DiagNotif, w: [
    { q: "Why Kafka?", a: "Decouples producers from workers. Absorbs traffic spikes (Black Friday). Replay capability for debugging." },
    { q: "Why channel workers?", a: "Push (APNS/FCM), Email (SES/SendGrid), SMS (Twilio) have different APIs, retry logic, rate limits, and auth." },
    { q: "At-least-once?", a: "Dedup by notification_id at consumer. Idempotent delivery. Better to receive twice than miss critical alerts." },
    { q: "Priority queues?", a: "Separate Kafka topics: high (password reset, OTP), medium (social), low (marketing). Different consumer pools." },
    { q: "User preferences?", a: "Preference service: user → {push: true, email: false, sms: true, quiet_hours: 22-07}. Check before sending." },
    { q: "Template system?", a: "Templates with variables: 'Hi {{name}}, {{friend}} liked your post'. Supports i18n. Stored in DB, cached in Redis." },
    { q: "Scale numbers?", a: "1B notifications/day → ~12K/sec. Partition Kafka by user_id. 50 consumer instances. Batch email sends (SES: 50/call)." } ]},
  { id: "twitter", n: "Twitter", i: "🐦", d: "Medium", D: DiagTwitter, w: [
    { q: "Why fan-out on write?", a: "Reads 100x more frequent than writes. Pay O(followers) once on write → O(1) feed reads from Redis. Pre-computed feeds." },
    { q: "Why NOT for celebrities?", a: "Elon tweets → 150M fan-out writes. Takes minutes. Hybrid: push for <10K followers, pull (merge on read) for celebrities." },
    { q: "Why Redis feeds?", a: "Sorted sets: ZADD feed:{user_id} timestamp tweet_id. ZREVRANGE for latest 20. O(log N) insert, O(K) read. TTL old entries." },
    { q: "Estimation?", a: "200M DAU × 5 reads/day = 1B reads/day → 12K QPS. 500K tweets/day → 6/sec writes. Fan-out: 6 × avg(200 followers) = 1.2K Redis writes/sec." },
    { q: "Data Model?", a: "Tweets: {id, user_id, content, media_urls[], created_at} in Cassandra. Users: PostgreSQL. Feeds: Redis sorted sets. Search: Elasticsearch." },
    { q: "Search?", a: "Elasticsearch with inverted index. Index on create. Near-real-time (<1s). Trending: count hashtags in sliding window (Redis sorted set)." },
    { q: "Media?", a: "Images/videos uploaded to S3 via presigned URL. Transcode to multiple sizes. Serve via CDN. Store media_url in tweet metadata." },
    { q: "Delete/Edit tweet?", a: "Soft delete: mark as deleted. Fan-out delete to feeds (async, eventual). Edit: append new version, keep history. Propagate to feeds." } ]},
  { id: "instagram", n: "Instagram", i: "📷", d: "Medium", D: DiagInstagram, w: [
    { q: "Why presigned URL?", a: "Client uploads 5MB photo directly to S3. App server only generates the URL — no bandwidth bottleneck. Parallel uploads." },
    { q: "Why async transcode?", a: "Post appears instantly with original image. Background workers generate thumbnails (150px, 600px, 1080px). Notify client when ready." },
    { q: "Why Cassandra for likes?", a: "Write-heavy: 500M+ likes/day. Wide-column: likes(post_id, user_id, timestamp). No joins needed. Horizontal scale." },
    { q: "Estimation?", a: "500M DAU, 100M photos/day × 500KB = 50TB/day raw. Thumbnails 3x = 150TB/day. 5 years = 270PB. CDN absorbs 95% of reads." },
    { q: "Feed generation?", a: "Hybrid fan-out: push for normal users, pull for celebrity accounts. Feed stored in Redis: sorted set of {post_id, timestamp}. Paginated." },
    { q: "Stories?", a: "Separate storage with 24h TTL. Write to user's story list in Redis. Expire automatically. Pre-load stories for followed users in feed service." },
    { q: "Explore / Discover?", a: "ML recommendation service: candidate generation (collaborative filtering) → ranking (engagement prediction). Precomputed hourly, served from cache." },
    { q: "Hashtags & Search?", a: "Elasticsearch indexes caption text and hashtags. Hashtag pages: aggregate posts by tag, sorted by recency or engagement." } ]},
  { id: "whatsapp", n: "WhatsApp", i: "💬", d: "Medium", D: DiagWhatsApp, w: [
    { q: "Why WebSocket?", a: "Full-duplex: server pushes messages instantly without client polling. One persistent connection per device. 1.2M msg/sec with WS gateways." },
    { q: "Offline delivery?", a: "Undelivered messages stored in Cassandra with recipient_id as partition key. On reconnect, WS gateway pulls pending messages. Mark as delivered." },
    { q: "Why E2E encryption?", a: "Signal Protocol: each user has public/private key pair. Server only sees encrypted blobs — can't read content. Key exchange on first contact." },
    { q: "Group messages?", a: "Sender sends once to server. Server fans out to all group members' queues. Group key shared among members. Max 1024 members." },
    { q: "Estimation?", a: "2B users, 100B msg/day → 1.2M msg/sec. Average message 100B → 10TB/day. Store 30 days = 300TB. Cassandra with msg_id timeuuid." },
    { q: "Read receipts & typing?", a: "Lightweight signals via same WS. Sent/delivered/read ticks. Typing indicator: ephemeral, not persisted. Throttled to 1 update/3sec." },
    { q: "Media sharing?", a: "Encrypt media client-side → upload to S3 → send URL + decryption key in message. Recipient downloads and decrypts locally." },
    { q: "Presence (online/last seen)?", a: "Heartbeat every 30s from client. Redis stores {user_id → last_seen}. TTL 60s. If expired = offline. Presence fanout only to chatting users." } ]},
  { id: "youtube", n: "YouTube", i: "▶️", d: "Medium", D: DiagYouTube, w: [
    { q: "Why multi encodings?", a: "Adaptive bitrate (ABR): client measures bandwidth, requests appropriate quality (144p→4K). Seamless quality switching mid-stream." },
    { q: "Why CDN?", a: "Video is 80%+ of internet traffic. Edge servers in 100+ cities. Popular videos cached at edge. Origin only serves cache misses." },
    { q: "Why HLS/DASH?", a: "Video split into 2-10 sec chunks. Manifest file lists all chunks + quality levels. Client downloads chunk-by-chunk. Enables seeking and quality switch." },
    { q: "Upload pipeline?", a: "Resumable upload to raw S3. Transcode workers: H.264/VP9/AV1 × 6 resolutions = 18+ variants. ~1 hour processing for 10min video. Parallel encoding." },
    { q: "Estimation?", a: "500 hrs uploaded/min × 500MB avg = 250GB/min uploaded. 1B views/day. 5min avg watch = 3.5GB/sec bandwidth. CDN handles 95%." },
    { q: "Recommendations?", a: "2-stage ML: candidate gen (1000s from collaborative filtering + content-based) → ranking (CTR prediction, watch time prediction). Personalized per user." },
    { q: "Comments & Likes?", a: "Comments: tree structure (parent_id for replies). Sharded by video_id. Likes: simple counter with Redis for real-time, batch sync to DB." },
    { q: "Copyright/Content ID?", a: "Audio/video fingerprinting on upload. Match against database of copyrighted content. Auto-flag, monetize, or block. Runs async in transcode pipeline." } ]},
  { id: "uber", n: "Uber", i: "🚗", d: "Medium", D: DiagUber, w: [
    { q: "Why GeoHash?", a: "Nearby coordinates share prefix. 'gcpuuz' and 'gcpuv0' are neighbors. Range query on prefix finds all drivers in grid cell. O(1) lookup in Redis." },
    { q: "Why Redis for location?", a: "1M active drivers × ping every 3s = 333K writes/sec. Redis Geo commands: GEOADD, GEORADIUS. In-memory = sub-ms. SQL would collapse." },
    { q: "Why surge pricing?", a: "Supply-demand imbalance: more riders than drivers → price multiplier (1.5x-3x). Incentivizes drivers to move to high-demand areas. Calculated per GeoHash cell." },
    { q: "Matching algorithm?", a: "Find K nearest available drivers within 5km radius (GEORADIUS). Score by: distance, ETA, driver rating, acceptance rate. Offer to best match with 15s timeout." },
    { q: "Estimation?", a: "20M rides/day. 5M concurrent drivers. Location updates: 5M × 1/3s = 1.7M writes/sec. Ride DB: 20M × 1KB = 20GB/day. Payment: 20M transactions/day." },
    { q: "ETA calculation?", a: "Pre-computed shortest paths using road graph + real-time traffic. Dijkstra/A* too slow — use contraction hierarchies. Cache ETAs for common routes." },
    { q: "Trip lifecycle?", a: "States: REQUESTED → MATCHED → DRIVER_EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETED → PAID. Each transition emits Kafka event. State machine in Ride Service." },
    { q: "Payments?", a: "Fare = base + (distance × rate) + (time × rate) + surge. Pre-authorize payment at request. Charge at completion. Stripe/Braintree integration. Refund flow for cancellations." } ]},
  { id: "dropbox", n: "Dropbox", i: "☁️", d: "Medium", D: DiagDropbox, w: [
    { q: "Why chunk files?", a: "4MB chunks. Change 1 byte in 1GB file → re-upload 1 chunk (4MB), not entire file. Resumable uploads. Parallel upload of chunks." },
    { q: "Why dedup?", a: "Content-addressable: chunk_hash = SHA256(chunk_data). Same content from 100 users stored once in S3. Saves 30-50% storage at scale." },
    { q: "Metadata vs Blocks?", a: "Metadata (file tree, versions, sharing) in PostgreSQL — needs ACID, joins. Block data in S3 — cheap, durable, infinitely scalable." },
    { q: "Sync protocol?", a: "Client watches file system changes (inotify/FSEvents). On change: chunk → hash → check server → upload only new chunks. Server notifies other clients via WS." },
    { q: "Estimation?", a: "500M users, avg 200 files × 500KB = 50PB total. 10M syncs/day. Delta sync saves 70% bandwidth. Metadata DB: 500M users × 200 files = 100B rows." },
    { q: "Conflict resolution?", a: "Last-writer-wins for most files. For simultaneous edits: create conflict copy '(conflicted copy - UserB)'. User manually merges. Versioning preserves all copies." },
    { q: "Sharing & permissions?", a: "Share link → access token. Permission levels: view, edit, admin. ACL stored in metadata DB. Namespace isolation between users. Team spaces with inherited permissions." },
    { q: "Notifications?", a: "WebSocket connection per client for real-time sync. Long polling as fallback. Notification service pushes {file_changed, user_id, file_path} events." } ]},
  { id: "docs", n: "Google Docs", i: "📝", d: "Hard", D: DiagGDocs, w: [
    { q: "Why OT?", a: "Operational Transform: transforms concurrent operations so all clients converge to the same state. Insert at position 5 + delete at position 3 → adjust insert to position 4." },
    { q: "OT vs CRDT?", a: "OT: simpler, needs central server to order ops. CRDT: peer-to-peer, no server needed, but more complex. Google Docs uses OT. Figma uses CRDT." },
    { q: "Why op log?", a: "Every keystroke = operation in append-only log. Enables: undo/redo, version history, time travel, audit trail. Periodic snapshots for fast loading." },
    { q: "WebSocket architecture?", a: "Each doc has a 'room'. Users join via WS. Ops broadcast to all room members. WS hub handles presence (cursor positions, selections). Typically 1 hub per doc shard." },
    { q: "Estimation?", a: "100M docs, 10M concurrent editors. Avg 2 ops/sec per user = 20M ops/sec. Each op ~100B. Op log: 20M × 100B × 86400 = 170TB/day. Compact via snapshots." },
    { q: "Cursor & selection?", a: "Each user's cursor position broadcast as ephemeral state (not persisted). Color-coded per user. Sent via same WS channel. Debounced to 100ms." },
    { q: "Permissions?", a: "ACL: owner, editor, commenter, viewer. Checked at WS connection time and per-op. Share via link or email. Google Drive integration for file management." },
    { q: "Offline editing?", a: "Queue ops locally. On reconnect, send queued ops. Server transforms against concurrent ops from other users. Merge conflicts automatically via OT." } ]},
  { id: "llm", n: "ChatGPT / LLM", i: "🤖", d: "Hard", D: DiagLLMChat, w: [
    { q: "Why token streaming?", a: "SSE/WebSocket streams tokens as generated (50-100 tokens/sec). User sees text appear instantly. Without streaming: 10-30sec blank wait for full response." },
    { q: "Why continuous batching?", a: "GPU processes N prompts in parallel. New requests join mid-batch as others finish. Maximizes GPU utilization from ~30% (naive) to ~80%. Key to cost efficiency." },
    { q: "Why separate queue?", a: "GPUs cost $2-8/hr each. Queue smooths bursty traffic (100x spikes). Priority queues: paid users skip ahead. Backpressure prevents OOM on GPU workers." },
    { q: "KV cache?", a: "Attention computation reuses previous tokens' keys/values. Cache per conversation avoids recomputing all prior tokens. 2-10x speedup for multi-turn chats." },
    { q: "Context window?", a: "GPT-4: 128K tokens. Longer context = more memory + slower. For long conversations: summarize old messages, keep recent + summary. RAG for external knowledge." },
    { q: "Rate limiting?", a: "Per-user token limits (100K tokens/min free, 500K paid). Per-model limits. Queue depth limits. Graceful degradation: smaller model fallback under load." },
    { q: "Safety & moderation?", a: "Input filter (fast classifier) → Generate → Output filter (toxicity, PII detection). Flagged content blocked or warning. Human review for edge cases." },
    { q: "Cost estimation?", a: "GPT-4: ~$30/1M input tokens, ~$60/1M output tokens. Average conversation: 2K tokens → $0.06-0.12. 1M conversations/day = $60-120K/day. Caching + smaller models reduce 70%." } ]},
  { id: "rag", n: "RAG (Retrieval)", i: "🔎", d: "Hard", D: DiagRAG, w: [
    { q: "Why RAG vs fine-tune?", a: "RAG: fresh data without retraining, citeable sources, cheaper ($0 vs $10K+ fine-tune). Fine-tune: change model behavior/style, domain-specific reasoning." },
    { q: "Why chunk documents?", a: "Embedding models have token limits (512-8K). Overlapping chunks (500 tokens, 50 overlap) preserve context at boundaries. Too small = loses context, too big = dilutes relevance." },
    { q: "Why vector DB?", a: "Approximate nearest neighbor (ANN) search in 1536-dim space. HNSW algorithm: O(log N) search. Pinecone, Weaviate, pgvector, Qdrant. Billions of vectors, <50ms search." },
    { q: "Top-K value?", a: "3-10 chunks typically. Too few = missing context. Too many = noise + token cost + distraction. Reranker (cross-encoder) improves precision after initial retrieval." },
    { q: "Chunking strategies?", a: "Fixed-size (simple), sentence-based (natural breaks), semantic (embed then cluster), recursive (split by heading → paragraph → sentence). Document-aware splits best." },
    { q: "Embedding model?", a: "OpenAI ada-002 (1536d), Cohere embed-v3, open-source (BGE, E5). Fine-tune embeddings on your domain for 10-30% retrieval improvement." },
    { q: "Hybrid search?", a: "Vector similarity + keyword (BM25) combined. Reciprocal Rank Fusion merges results. Handles both semantic ('machine learning') and exact ('error code 403')." },
    { q: "Evaluation?", a: "Metrics: recall@K (did we retrieve relevant docs?), answer correctness (LLM judge), faithfulness (is answer grounded in retrieved docs?). RAGAS framework." } ]},
  { id: "imggen", n: "AI Image Gen", i: "🎨", d: "Hard", D: DiagImageGen, w: [
    { q: "Why async queue?", a: "5-30s generation time. Sync HTTP would timeout. Client submits job → gets job_id → polls status endpoint or subscribes via WebSocket." },
    { q: "Why double safety?", a: "Pre-generation: fast text classifier on prompt (block obviously bad). Post-generation: NSFW image classifier on output (catches creative evasions). Blocks <0.1% of traffic." },
    { q: "Why GPU pooling?", a: "A100 GPUs: $2-4/hr each. Batch multiple requests per GPU (4-8 images). Auto-scale pool based on queue depth. Spot instances for non-urgent requests (70% cheaper)." },
    { q: "Store vs regenerate?", a: "Cache by normalized_prompt_hash. Popular prompts (logos, stock images) served from S3 CDN in <100ms. Cache hit rate: 15-25% in production." },
    { q: "Diffusion pipeline?", a: "Text → CLIP encoder → embeddings → UNet denoising (20-50 steps) → VAE decoder → image. Each step: GPU-bound. Classifier-free guidance for quality." },
    { q: "Resolution & variants?", a: "Base: 512×512 or 1024×1024. Upscaler model: 4x resolution. Generate 4 variants per prompt for user selection. Inpainting: edit specific regions." },
    { q: "Estimation?", a: "1M images/day. Avg 15 sec/image on A100. 1M × 15 / 86400 = 174 GPUs needed. × 1.5 headroom = 260 GPUs. Cost: 260 × $3/hr × 24 = $18.7K/day." },
    { q: "User experience?", a: "Progress bar: report denoising step (15/50). Live preview: show intermediate image every 5 steps. Estimated time remaining. Gallery of recent generations." } ]},
  { id: "recsys", n: "Recommendation ML", i: "🎯", d: "Hard", D: DiagRecSys, w: [
    { q: "Why 2-stage?", a: "Retrieval (fast): scan 10M items, return 1000 candidates using cheap model. Ranking (precise): score 1000 candidates with expensive model, return top 10." },
    { q: "Why feature store?", a: "Training and serving MUST use same feature computation. Feature store (Feast, Tecton): compute once, serve to both. Prevents training-serving skew." },
    { q: "Why event logging?", a: "Every impression + click + skip = training data. Log: {user, item, action, timestamp, context}. Feed into next model training cycle. Data flywheel." },
    { q: "Real-time vs batch?", a: "Batch: retrain daily/weekly on full dataset. Real-time: update user embeddings on each interaction. Hybrid: batch for base model + real-time feature updates." },
    { q: "Cold start problem?", a: "New user: use demographics, trending items, popularity. New item: content-based features (category, tags, description). Explore/exploit: show some random items." },
    { q: "Candidate generation?", a: "Collaborative filtering: users who liked X also liked Y. Content-based: item features similarity. ANN search on user/item embeddings. Multiple sources merged." },
    { q: "Ranking model?", a: "Features: user history, item features, context (time, device). Model: deep neural network predicting P(click), P(watch>30s), P(purchase). Multi-objective optimization." },
    { q: "A/B testing?", a: "Route 5% traffic to new model. Measure: CTR, watch time, DAU retention, revenue. Significance testing over 1-2 weeks. Gradual rollout if winning." } ]},
  { id: "agent", n: "AI Agent (Tools)", i: "🛠️", d: "Hard", D: DiagAIAgent, w: [
    { q: "Why ReAct loop?", a: "Reason-Act-Observe: LLM thinks about what to do → calls a tool → observes result → decides next step. Handles multi-step tasks like research, coding, data analysis." },
    { q: "Why tool router?", a: "LLM outputs structured JSON: {tool: 'search', params: {query: '...'}}. Router validates schema, checks permissions, executes in sandbox. Prevents injection attacks." },
    { q: "Why memory store?", a: "Context window is finite (128K tokens max). Long conversations: summarize old turns into memory. Vector store for facts. Working memory + long-term memory separation." },
    { q: "Infinite loop risk?", a: "Cap at N iterations (10-15). Detect repetitive actions (same tool call 3x). Timeout per step (30s). Force 'final_answer' tool after N steps." },
    { q: "Tool design?", a: "Each tool: name, description, JSON schema for params, execution function. Good descriptions = better LLM tool selection. 5-15 tools typical. Too many confuses model." },
    { q: "Planning vs reactive?", a: "Plan-then-execute: LLM creates full plan upfront, execute sequentially. ReAct: plan one step at a time. Hybrid: outline plan, adapt per step. Tree-of-thought for complex." },
    { q: "Error handling?", a: "Tool errors returned as observations. LLM can retry with different params, try alternative tool, or report failure to user. Graceful degradation." },
    { q: "Evaluation?", a: "Task completion rate, tool call accuracy, steps to completion, cost per task. Benchmark on standard tasks (WebArena, SWE-bench). Human eval for quality." } ]},
];

export const DIFF_FLOW = { Easy: C.green, Medium: C.accent, Hard: C.red };
