(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[3485],{91474:function(e,t,r){Promise.resolve().then(r.bind(r,1845))},1845:function(e,t,r){"use strict";r.r(t),r.d(t,{default:function(){return h}});var l=r(57437),c=r(2265),n=r(8400),s=r(78030);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,s.Z)("GripVertical",[["circle",{cx:"9",cy:"12",r:"1",key:"1vctgf"}],["circle",{cx:"9",cy:"5",r:"1",key:"hp0tcf"}],["circle",{cx:"9",cy:"19",r:"1",key:"fkjjf6"}],["circle",{cx:"15",cy:"12",r:"1",key:"1tmaij"}],["circle",{cx:"15",cy:"5",r:"1",key:"19l28e"}],["circle",{cx:"15",cy:"19",r:"1",key:"f4zoj3"}]]);var o=r(75733),i=r(47019);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let d=(0,s.Z)("CircleCheck",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);var u=r(49590),f=r(97643);function h(){let[e,t]=(0,c.useState)([]),[r,s]=(0,c.useState)(!1),h=(0,c.useRef)(null),y=(0,c.useRef)(null);function m(e){e.preventDefault();let r=h.current,l=y.current;null!==r&&null!==l&&r!==l&&(t(e=>{let t=[...e],[c]=t.splice(r,1);return t.splice(l,0,c),t}),h.current=null,y.current=null)}function p(){h.current=null,y.current=null}(0,c.useEffect)(()=>{let e=(0,f.yn)(),r=new Map(e.map(e=>[e.key,e.visible])),l=[];e.forEach(e=>{var t;let{key:c}=e,n=f.Ri.find(e=>e.key===c);n&&l.push({key:c,visible:null===(t=r.get(c))||void 0===t||t,item:n})}),f.Ri.forEach(e=>{l.find(t=>t.key===e.key)||l.push({key:e.key,visible:!0,item:e})}),t(l)},[]);let x=e.filter(e=>e.visible).slice(0,8);return(0,l.jsxs)("div",{className:"space-y-5",children:[(0,l.jsxs)("div",{children:[(0,l.jsxs)("h1",{className:"text-xl font-bold flex items-center gap-2",style:{color:"#1a2744"},children:[(0,l.jsx)(n.Z,{className:"w-5 h-5",style:{color:"#1d6ae5"}}),"เมนูด่วน (มือถือ)"]}),(0,l.jsx)("p",{className:"text-sm mt-1",style:{color:"#4a6080"},children:"จัดลำดับและเลือกเมนูที่แสดงในหน้าหลัก (มือถือ) — แสดงได้สูงสุด 8 รายการ"})]}),(0,l.jsxs)("div",{className:"grid xl:grid-cols-2 gap-5 items-start",children:[(0,l.jsxs)("div",{className:"card space-y-1",children:[(0,l.jsx)("p",{className:"text-xs font-semibold uppercase tracking-wider mb-3",style:{color:"#94a3b8"},children:"ลากเพื่อเรียงลำดับ"}),e.map((r,c)=>{let{item:n,visible:s}=r;return(0,l.jsxs)("div",{draggable:!0,onDragStart:e=>{h.current=c,e.dataTransfer.effectAllowed="move"},onDragOver:e=>{e.preventDefault(),e.dataTransfer.dropEffect="move",y.current=c},onDrop:m,onDragEnd:p,className:"flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-grab active:cursor-grabbing select-none transition-colors",style:{backgroundColor:s?"#f5f8ff":"#f8fafc",borderColor:s?"#dce6f9":"#e2e8f0",opacity:s?1:.6},children:[(0,l.jsx)(a,{className:"w-4 h-4 flex-shrink-0",style:{color:"#94a3b8"}}),(0,l.jsx)("div",{className:"w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",style:{backgroundColor:n.bg},children:(0,l.jsx)(n.Icon,{className:"w-4 h-4",style:{color:n.color}})}),(0,l.jsxs)("div",{className:"flex-1 min-w-0",children:[(0,l.jsx)("p",{className:"text-sm font-medium truncate",style:{color:"#1a2744"},children:n.label}),(0,l.jsx)("p",{className:"text-[11px]",style:{color:"#94a3b8"},children:n.key})]}),s&&(()=>{let t=e.filter((e,t)=>e.visible&&t<=c).length-1,r=t<8;return(0,l.jsx)("span",{className:"text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0",style:{backgroundColor:r?"#e8f0fe":"#f1f5f9",color:r?"#1d6ae5":"#94a3b8"},children:r?"#".concat(t+1):"ซ่อน (เกิน 8)"})})(),(0,l.jsx)("button",{onClick:()=>{var e;return e=n.key,void t(t=>t.map(t=>t.key===e?{...t,visible:!t.visible}:t))},className:"flex-shrink-0 p-1 rounded-lg transition-colors hover:bg-white",title:s?"ซ่อนเมนูนี้":"แสดงเมนูนี้",children:s?(0,l.jsx)(o.Z,{className:"w-4 h-4",style:{color:"#1d6ae5"}}):(0,l.jsx)(i.Z,{className:"w-4 h-4",style:{color:"#94a3b8"}})})]},n.key)})]}),(0,l.jsxs)("div",{className:"space-y-4 xl:sticky xl:top-4",children:[(0,l.jsxs)("div",{className:"card",children:[(0,l.jsx)("p",{className:"text-xs font-semibold uppercase tracking-wider mb-3",style:{color:"#94a3b8"},children:"ตัวอย่างการแสดงผล (มือถือ)"}),0===x.length?(0,l.jsx)("p",{className:"text-sm text-center py-6",style:{color:"#94a3b8"},children:"ไม่มีเมนูที่เปิดใช้งาน"}):(0,l.jsx)("div",{className:"mx-auto max-w-[280px]",children:(0,l.jsxs)("div",{className:"rounded-2xl p-4 shadow-inner",style:{backgroundColor:"#f5f8ff",border:"1px solid #dce6f9"},children:[(0,l.jsxs)("div",{className:"flex items-center justify-between mb-3",children:[(0,l.jsx)("p",{className:"text-xs font-semibold",style:{color:"#1a2744"},children:"เมนูด่วน"}),(0,l.jsx)("span",{className:"text-[10px]",style:{color:"#1d6ae5"},children:"ดูทั้งหมด →"})]}),(0,l.jsx)("div",{className:"grid grid-cols-4 gap-2",children:x.map(e=>{let{item:t}=e;return(0,l.jsxs)("div",{className:"flex flex-col items-center gap-1.5 p-2 rounded-xl",style:{backgroundColor:t.bg},children:[(0,l.jsx)("div",{className:"w-9 h-9 rounded-xl flex items-center justify-center",style:{backgroundColor:t.bg},children:(0,l.jsx)(t.Icon,{className:"w-4 h-4",style:{color:t.color}})}),(0,l.jsx)("span",{className:"text-[9px] font-medium text-center leading-tight",style:{color:"#1a2744"},children:t.label})]},t.key)})})]})}),(0,l.jsxs)("p",{className:"text-[11px] text-center mt-3",style:{color:"#94a3b8"},children:["แสดง ",x.length,"/8 เมนู"]})]}),(0,l.jsxs)("div",{className:"flex flex-col gap-2.5",children:[(0,l.jsx)("button",{onClick:function(){let t=e.map(e=>{let{key:t,visible:r}=e;return{key:t,visible:r}});(0,f.xf)(t),s(!0),setTimeout(()=>s(!1),2e3)},className:"w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all",style:{backgroundColor:r?"#10b981":"#1d6ae5"},children:r?(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)(d,{className:"w-4 h-4"})," บันทึกแล้ว!"]}):"บันทึกการตั้งค่า"}),(0,l.jsxs)("button",{onClick:function(){let e=f.Ri.map((e,t)=>({key:e.key,visible:t<8}));(0,f.xf)(e),t(f.Ri.map((e,t)=>({key:e.key,visible:t<8,item:e}))),s(!0),setTimeout(()=>s(!1),2e3)},className:"w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors",style:{backgroundColor:"#f5f8ff",color:"#4a6080",border:"1px solid #dce6f9"},children:[(0,l.jsx)(u.Z,{className:"w-3.5 h-3.5"})," รีเซ็ตเป็นค่าเริ่มต้น"]})]}),(0,l.jsxs)("div",{className:"rounded-xl px-4 py-3 text-xs",style:{backgroundColor:"#fffbeb",border:"1px solid #fef3c7",color:"#92400e"},children:[(0,l.jsx)("p",{className:"font-semibold mb-1",children:"หมายเหตุ"}),(0,l.jsxs)("ul",{className:"space-y-1 list-disc pl-4",children:[(0,l.jsx)("li",{children:"การตั้งค่านี้จะบันทึกเฉพาะในเบราว์เซอร์นี้"}),(0,l.jsx)("li",{children:"เมนูที่ไม่มีสิทธิ์ใช้งานจะถูกซ่อนอัตโนมัติ"}),(0,l.jsx)("li",{children:"แสดงได้สูงสุด 8 เมนูในหน้าหลัก"})]})]})]})]})]})}},97643:function(e,t,r){"use strict";r.d(t,{Ri:function(){return y},yw:function(){return k},yn:function(){return p},xf:function(){return x}});var l=r(85302),c=r(73045),n=r(10724),s=r(52891),a=r(60360),o=r(33855),i=r(47215);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let d=(0,r(78030).Z)("Headphones",[["path",{d:"M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3",key:"1xhozi"}]]);var u=r(11240),f=r(90904),h=r(64590);let y=[{key:"equipment",href:"/equipment",label:"ครุภัณฑ์",Icon:l.Z,color:"#1d6ae5",bg:"#eff4ff",module:"EQUIPMENT"},{key:"repair",href:"/helpdesk/new",label:"แจ้งซ่อม",Icon:c.Z,color:"#dc2626",bg:"#fef2f2",module:"HELPDESK"},{key:"pm",href:"/helpdesk/pm",label:"PM บำรุงรักษา",Icon:n.Z,color:"#7c3aed",bg:"#f3e8ff",module:"HELPDESK"},{key:"borrow",href:"/equipment/borrows",label:"ยืม-คืน",Icon:s.Z,color:"#0d9068",bg:"#e6f9f0",module:"EQUIPMENT"},{key:"room",href:"/room",label:"จองห้องประชุม",Icon:a.Z,color:"#b45309",bg:"#fffbeb",module:"ROOM_BOOKING"},{key:"duty",href:"/duty",label:"เวรรับนักเรียน",Icon:o.Z,color:"#1d6ae5",bg:"#eff4ff",module:"DUTY"},{key:"lost",href:"/lost-found",label:"ของหาย",Icon:i.Z,color:"#16a34a",bg:"#f0fdf4",module:"LOST_FOUND"},{key:"helpdesk",href:"/helpdesk",label:"Helpdesk",Icon:d,color:"#4a6080",bg:"#f5f8ff",module:"HELPDESK"},{key:"personnel",href:"/personnel",label:"บุคลากร",Icon:u.Z,color:"#0369a1",bg:"#e0f2fe",module:"PERSONNEL"},{key:"leave",href:"/leave",label:"ระบบการลา",Icon:f.Z,color:"#7e22ce",bg:"#f5f3ff",module:"LEAVE"},{key:"worklog",href:"/worklog",label:"บันทึกปฏิบัติงาน",Icon:h.Z,color:"#0d9068",bg:"#e6f9f0",module:"WORK_LOG"}],m="retc_quick_menu";function p(){try{let e=localStorage.getItem(m);if(e)return JSON.parse(e)}catch(e){}return y.map((e,t)=>({key:e.key,visible:t<8}))}function x(e){localStorage.setItem(m,JSON.stringify(e))}function k(e,t){let r=new Map(e.map(e=>[e.key,e.visible]));return y.filter(e=>{let l=!1!==r.get(e.key),c=!e.module||!t||t.includes(e.module);return l&&c}).sort((t,r)=>{let l=e.findIndex(e=>e.key===t.key),c=e.findIndex(e=>e.key===r.key);return(-1===l?999:l)-(-1===c?999:c)})}},78030:function(e,t,r){"use strict";r.d(t,{Z:function(){return o}});var l=r(2265);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let c=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),n=function(){for(var e=arguments.length,t=Array(e),r=0;r<e;r++)t[r]=arguments[r];return t.filter((e,t,r)=>!!e&&r.indexOf(e)===t).join(" ")};/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var s={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,l.forwardRef)((e,t)=>{let{color:r="currentColor",size:c=24,strokeWidth:a=2,absoluteStrokeWidth:o,className:i="",children:d,iconNode:u,...f}=e;return(0,l.createElement)("svg",{ref:t,...s,width:c,height:c,stroke:r,strokeWidth:o?24*Number(a)/Number(c):a,className:n("lucide",i),...f},[...u.map(e=>{let[t,r]=e;return(0,l.createElement)(t,r)}),...Array.isArray(d)?d:[d]])}),o=(e,t)=>{let r=(0,l.forwardRef)((r,s)=>{let{className:o,...i}=r;return(0,l.createElement)(a,{ref:s,iconNode:t,className:n("lucide-".concat(c(e)),o),...i})});return r.displayName="".concat(e),r}},52891:function(e,t,r){"use strict";r.d(t,{Z:function(){return l}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let l=(0,r(78030).Z)("ArrowLeftRight",[["path",{d:"M8 3 4 7l4 4",key:"9rb6wj"}],["path",{d:"M4 7h16",key:"6tx8e3"}],["path",{d:"m16 21 4-4-4-4",key:"siv7j2"}],["path",{d:"M20 17H4",key:"h6l3hr"}]])},10724:function(e,t,r){"use strict";r.d(t,{Z:function(){return l}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let l=(0,r(78030).Z)("CalendarCheck2",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["path",{d:"M21 14V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8",key:"bce9hv"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"m16 20 2 2 4-4",key:"13tcca"}]])},33855:function(e,t,r){"use strict";r.d(t,{Z:function(){return l}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let l=(0,r(78030).Z)("CalendarCheck",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"m9 16 2 2 4-4",key:"19s6y9"}]])},90904:function(e,t,r){"use strict";r.d(t,{Z:function(){return l}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let l=(0,r(78030).Z)("CalendarX",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"m14 14-4 4",key:"rymu2i"}],["path",{d:"m10 14 4 4",key:"3sz06r"}]])},64590:function(e,t,r){"use strict";r.d(t,{Z:function(){return l}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let l=(0,r(78030).Z)("ClipboardList",[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]])},60360:function(e,t,r){"use strict";r.d(t,{Z:function(){return l}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let l=(0,r(78030).Z)("DoorOpen",[["path",{d:"M13 4h3a2 2 0 0 1 2 2v14",key:"hrm0s9"}],["path",{d:"M2 20h3",key:"1gaodv"}],["path",{d:"M13 20h9",key:"s90cdi"}],["path",{d:"M10 12v.01",key:"vx6srw"}],["path",{d:"M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z",key:"199qr4"}]])},47019:function(e,t,r){"use strict";r.d(t,{Z:function(){return l}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let l=(0,r(78030).Z)("EyeOff",[["path",{d:"M9.88 9.88a3 3 0 1 0 4.24 4.24",key:"1jxqfv"}],["path",{d:"M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68",key:"9wicm4"}],["path",{d:"M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61",key:"1jreej"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22",key:"a6p6uj"}]])},75733:function(e,t,r){"use strict";r.d(t,{Z:function(){return l}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let l=(0,r(78030).Z)("Eye",[["path",{d:"M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z",key:"rwhkz3"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]])},85302:function(e,t,r){"use strict";r.d(t,{Z:function(){return l}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let l=(0,r(78030).Z)("Monitor",[["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2",key:"48i651"}],["line",{x1:"8",x2:"16",y1:"21",y2:"21",key:"1svkeh"}],["line",{x1:"12",x2:"12",y1:"17",y2:"21",key:"vw1qmm"}]])},47215:function(e,t,r){"use strict";r.d(t,{Z:function(){return l}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let l=(0,r(78030).Z)("PackageSearch",[["path",{d:"M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14",key:"e7tb2h"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["line",{x1:"12",x2:"12",y1:"22",y2:"12",key:"a4e8g8"}],["circle",{cx:"18.5",cy:"15.5",r:"2.5",key:"b5zd12"}],["path",{d:"M20.27 17.27 22 19",key:"1l4muz"}]])},49590:function(e,t,r){"use strict";r.d(t,{Z:function(){return l}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let l=(0,r(78030).Z)("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]])},8400:function(e,t,r){"use strict";r.d(t,{Z:function(){return l}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let l=(0,r(78030).Z)("Smartphone",[["rect",{width:"14",height:"20",x:"5",y:"2",rx:"2",ry:"2",key:"1yt0o3"}],["path",{d:"M12 18h.01",key:"mhygvu"}]])},11240:function(e,t,r){"use strict";r.d(t,{Z:function(){return l}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let l=(0,r(78030).Z)("Users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]])},73045:function(e,t,r){"use strict";r.d(t,{Z:function(){return l}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let l=(0,r(78030).Z)("Wrench",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",key:"cbrjhi"}]])}},function(e){e.O(0,[2971,7023,1744],function(){return e(e.s=91474)}),_N_E=e.O()}]);