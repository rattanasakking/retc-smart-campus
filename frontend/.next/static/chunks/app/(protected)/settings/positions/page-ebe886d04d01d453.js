(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[988],{26060:function(e,t,a){Promise.resolve().then(a.bind(a,53787))},53787:function(e,t,a){"use strict";a.r(t),a.d(t,{default:function(){return m}});var n=a(57437),s=a(2265),r=a(3274);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let i=(0,a(78030).Z)("Briefcase",[["path",{d:"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",key:"jecpp"}],["rect",{width:"20",height:"14",x:"2",y:"6",rx:"2",key:"i6l2r4"}]]);var l=a(92513),c=a(22468),o=a(74697),d=a(18422),u=a(10883),h=a(96264);function m(){let[e,t]=(0,s.useState)([]),[a,m]=(0,s.useState)(!0),[f,x]=(0,s.useState)(""),[p,g]=(0,s.useState)(!1),[y,v]=(0,s.useState)(null),[k,w]=(0,s.useState)(""),[j,N]=(0,s.useState)(!1),[b,Z]=(0,s.useState)(""),[C,E]=(0,s.useState)(!1),S=function(e){let t=arguments.length>1&&void 0!==arguments[1]&&arguments[1];Z(e),E(t),setTimeout(()=>Z(""),3e3)},M=(0,s.useCallback)(async()=>{try{var e;let a=await h.hi.get("/settings/positions");t(null!==(e=a.data)&&void 0!==e?e:[])}catch(e){S("โหลดข้อมูลไม่สำเร็จ",!0)}finally{m(!1)}},[]);(0,s.useEffect)(()=>{M()},[M]);let _=async()=>{if(f.trim()){g(!0);try{var e;let a=await h.hi.post("/settings/positions",{name:f.trim()});t(null!==(e=a.data)&&void 0!==e?e:[]),x(""),S("เพิ่มตำแหน่งสำเร็จ")}catch(e){S(e.message,!0)}finally{g(!1)}}},T=async e=>{if(k.trim()){N(!0);try{var a;let n=await h.hi.put("/settings/positions/".concat(e),{name:k.trim()});t(null!==(a=n.data)&&void 0!==a?a:[]),v(null),S("แก้ไขสำเร็จ")}catch(e){S(e.message,!0)}finally{N(!1)}}},z=async a=>{if(confirm('ลบตำแหน่ง "'.concat(e[a],'" ?')))try{var n;let e=await h.hi.delete("/settings/positions/".concat(a));t(null!==(n=e.data)&&void 0!==n?n:[]),S("ลบตำแหน่งสำเร็จ")}catch(e){S(e.message,!0)}};return a?(0,n.jsxs)("div",{className:"flex items-center justify-center h-48 gap-2 text-gray-400",children:[(0,n.jsx)(r.Z,{className:"w-5 h-5 animate-spin"})," กำลังโหลด..."]}):(0,n.jsxs)("div",{className:"max-w-xl space-y-5",children:[b&&(0,n.jsx)("div",{className:"fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow text-sm font-medium text-white ".concat(C?"bg-red-500":"bg-green-600"),children:b}),(0,n.jsxs)("div",{children:[(0,n.jsxs)("h1",{className:"text-xl font-bold text-[#1a2744] flex items-center gap-2",children:[(0,n.jsx)(i,{className:"w-5 h-5 text-[#1d6ae5]"})," จัดการตำแหน่ง"]}),(0,n.jsx)("p",{className:"text-sm text-[#94a3b8] mt-1",children:"เพิ่ม แก้ไข หรือลบตำแหน่งบุคลากร"})]}),(0,n.jsxs)("div",{className:"card flex gap-2",children:[(0,n.jsx)("input",{className:"input-field flex-1",placeholder:"ชื่อตำแหน่งใหม่ เช่น ครูอัตราจ้าง",value:f,onChange:e=>x(e.target.value),onKeyDown:e=>"Enter"===e.key&&_()}),(0,n.jsxs)("button",{onClick:_,disabled:p||!f.trim(),className:"btn-primary flex items-center gap-1.5 px-4",children:[p?(0,n.jsx)(r.Z,{className:"w-4 h-4 animate-spin"}):(0,n.jsx)(l.Z,{className:"w-4 h-4"}),"เพิ่ม"]})]}),(0,n.jsxs)("div",{className:"card divide-y divide-[#dce6f9]",children:[0===e.length&&(0,n.jsx)("p",{className:"text-sm text-[#94a3b8] py-4 text-center",children:"ยังไม่มีตำแหน่ง — เพิ่มตำแหน่งแรกด้านบน"}),e.map((e,t)=>(0,n.jsx)("div",{className:"flex items-center gap-2 py-2.5 first:pt-0 last:pb-0",children:y===t?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)("input",{className:"input-field flex-1 text-sm py-1.5",value:k,onChange:e=>w(e.target.value),onKeyDown:e=>"Enter"===e.key&&T(t),autoFocus:!0}),(0,n.jsx)("button",{onClick:()=>T(t),disabled:j,className:"p-1.5 rounded-lg text-green-600 hover:bg-green-50",children:j?(0,n.jsx)(r.Z,{className:"w-4 h-4 animate-spin"}):(0,n.jsx)(c.Z,{className:"w-4 h-4"})}),(0,n.jsx)("button",{onClick:()=>v(null),className:"p-1.5 rounded-lg text-gray-400 hover:bg-gray-50",children:(0,n.jsx)(o.Z,{className:"w-4 h-4"})})]}):(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)("span",{className:"flex-1 text-sm text-[#1a2744]",children:e}),(0,n.jsx)("button",{onClick:()=>{v(t),w(e)},className:"p-1.5 rounded-lg text-[#4a6080] hover:bg-[#f5f8ff]",children:(0,n.jsx)(d.Z,{className:"w-3.5 h-3.5"})}),(0,n.jsx)("button",{onClick:()=>z(t),className:"p-1.5 rounded-lg text-red-400 hover:bg-red-50",children:(0,n.jsx)(u.Z,{className:"w-3.5 h-3.5"})})]})},t))]})]})}},96264:function(e,t,a){"use strict";a.d(t,{B1:function(){return n},YJ:function(){return s},hi:function(){return i}});let n="retc_token",s="retc_user";async function r(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},a=localStorage.getItem(n),r={"Content-Type":"application/json",...t.headers};a&&(r.Authorization="Bearer ".concat(a));let i=await fetch("".concat("/api").concat(e),{...t,headers:r,cache:"no-store"});if(401===i.status)throw localStorage.removeItem(n),localStorage.removeItem(s),window.location.href="/login",Error("กรุณาเข้าสู่ระบบใหม่");let l=await i.json();if(!i.ok)throw Error(l.message||"เกิดข้อผิดพลาด");return l}let i={get:e=>r(e,{method:"GET"}),post:(e,t)=>r(e,{method:"POST",body:JSON.stringify(t)}),put:(e,t)=>r(e,{method:"PUT",body:JSON.stringify(t)}),delete:e=>r(e,{method:"DELETE"})}},78030:function(e,t,a){"use strict";a.d(t,{Z:function(){return c}});var n=a(2265);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),r=function(){for(var e=arguments.length,t=Array(e),a=0;a<e;a++)t[a]=arguments[a];return t.filter((e,t,a)=>!!e&&a.indexOf(e)===t).join(" ")};/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var i={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let l=(0,n.forwardRef)((e,t)=>{let{color:a="currentColor",size:s=24,strokeWidth:l=2,absoluteStrokeWidth:c,className:o="",children:d,iconNode:u,...h}=e;return(0,n.createElement)("svg",{ref:t,...i,width:s,height:s,stroke:a,strokeWidth:c?24*Number(l)/Number(s):l,className:r("lucide",o),...h},[...u.map(e=>{let[t,a]=e;return(0,n.createElement)(t,a)}),...Array.isArray(d)?d:[d]])}),c=(e,t)=>{let a=(0,n.forwardRef)((a,i)=>{let{className:c,...o}=a;return(0,n.createElement)(l,{ref:i,iconNode:t,className:r("lucide-".concat(s(e)),c),...o})});return a.displayName="".concat(e),a}},22468:function(e,t,a){"use strict";a.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,a(78030).Z)("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]])},3274:function(e,t,a){"use strict";a.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,a(78030).Z)("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]])},18422:function(e,t,a){"use strict";a.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,a(78030).Z)("Pencil",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}],["path",{d:"m15 5 4 4",key:"1mk7zo"}]])},92513:function(e,t,a){"use strict";a.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,a(78030).Z)("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]])},10883:function(e,t,a){"use strict";a.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,a(78030).Z)("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]])},74697:function(e,t,a){"use strict";a.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,a(78030).Z)("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]])}},function(e){e.O(0,[2971,7023,1744],function(){return e(e.s=26060)}),_N_E=e.O()}]);