(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[246],{22098:function(e,t,r){Promise.resolve().then(r.bind(r,71649))},71649:function(e,t,r){"use strict";r.r(t),r.d(t,{default:function(){return m}});var a=r(57437),n=r(2265),s=r(16463),o=r(87138),l=r(74232);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let c=(0,r(78030).Z)("Network",[["rect",{x:"16",y:"16",width:"6",height:"6",rx:"1",key:"4q2zg0"}],["rect",{x:"2",y:"16",width:"6",height:"6",rx:"1",key:"8cvhb9"}],["rect",{x:"9",y:"2",width:"6",height:"6",rx:"1",key:"1egb70"}],["path",{d:"M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3",key:"1jsf9p"}],["path",{d:"M12 12V8",key:"2874zd"}]]);var i=r(11240),u=r(20500),d=r(24258),h=r(70518),f=r(96264);let p=[{href:"/settings/general",label:"ข้อมูลวิทยาลัย",Icon:l.Z},{href:"/settings/organization",label:"โครงสร้างองค์กร",Icon:c},{href:"/settings/users",label:"จัดการผู้ใช้",Icon:i.Z},{href:"/settings/permissions",label:"สิทธิ์การใช้งาน",Icon:u.Z}];function m(e){let{children:t}=e,r=(0,s.useRouter)(),l=(0,s.usePathname)(),[c,i]=(0,n.useState)(!1);return((0,n.useEffect)(()=>{let e=localStorage.getItem(f.YJ);if(!e){r.replace("/login");return}try{if(!JSON.parse(e).isSuperAdmin){r.replace("/dashboard");return}}catch(e){r.replace("/login");return}i(!0)},[r]),c)?(0,a.jsxs)("div",{className:"flex gap-5 items-start",children:[(0,a.jsx)("aside",{className:"w-[184px] flex-shrink-0 sticky top-0",children:(0,a.jsxs)("div",{className:"rounded-xl overflow-hidden",style:{backgroundColor:"#ffffff",border:"1px solid #dce6f9"},children:[(0,a.jsxs)("div",{className:"flex items-center gap-2 px-4 py-3",style:{borderBottom:"1px solid #dce6f9"},children:[(0,a.jsx)(d.Z,{className:"w-3.5 h-3.5",style:{color:"#4a6080"}}),(0,a.jsx)("span",{className:"text-sm font-semibold",style:{color:"#1a2744"},children:"การตั้งค่า"})]}),(0,a.jsx)("nav",{className:"py-1.5",children:p.map(e=>{let{href:t,label:r,Icon:n}=e,s=l===t||l.startsWith(t+"/");return(0,a.jsxs)(o.default,{href:t,className:"flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors",style:{backgroundColor:s?"#2979ff":"transparent",color:s?"#ffffff":"#4a6080",fontWeight:s?500:400},onMouseEnter:e=>{s||(e.currentTarget.style.backgroundColor="#f5f8ff"),s||(e.currentTarget.style.color="#1a2744")},onMouseLeave:e=>{s||(e.currentTarget.style.backgroundColor="transparent"),s||(e.currentTarget.style.color="#4a6080")},children:[(0,a.jsx)(n,{className:"w-3.5 h-3.5 flex-shrink-0"}),(0,a.jsx)("span",{className:"truncate",children:r})]},t)})}),(0,a.jsx)("div",{className:"px-3 py-2.5",style:{borderTop:"1px solid #dce6f9"},children:(0,a.jsxs)(o.default,{href:"/dashboard",className:"flex items-center gap-1.5 text-xs transition-colors hover:text-[#1d6ae5]",style:{color:"#94a3b8"},children:[(0,a.jsx)(h.Z,{className:"w-3 h-3"})," กลับหน้าหลัก"]})})]})}),(0,a.jsx)("div",{className:"flex-1 min-w-0",children:t})]}):(0,a.jsx)("div",{className:"flex items-center justify-center h-48",children:(0,a.jsx)("div",{className:"w-8 h-8 border-4 border-t-transparent rounded-full animate-spin",style:{borderColor:"#1d6ae5",borderTopColor:"transparent"}})})}},96264:function(e,t,r){"use strict";r.d(t,{B1:function(){return a},YJ:function(){return n},hi:function(){return o}});let a="retc_token",n="retc_user";async function s(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},r=localStorage.getItem(a),s={"Content-Type":"application/json",...t.headers};r&&(s.Authorization="Bearer ".concat(r));let o=await fetch("".concat("/api").concat(e),{...t,headers:s});if(401===o.status)throw localStorage.removeItem(a),localStorage.removeItem(n),window.location.href="/login",Error("กรุณาเข้าสู่ระบบใหม่");let l=await o.json();if(!o.ok)throw Error(l.message||"เกิดข้อผิดพลาด");return l}let o={get:e=>s(e,{method:"GET"}),post:(e,t)=>s(e,{method:"POST",body:JSON.stringify(t)}),put:(e,t)=>s(e,{method:"PUT",body:JSON.stringify(t)}),delete:e=>s(e,{method:"DELETE"})}},78030:function(e,t,r){"use strict";r.d(t,{Z:function(){return c}});var a=r(2265);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),s=function(){for(var e=arguments.length,t=Array(e),r=0;r<e;r++)t[r]=arguments[r];return t.filter((e,t,r)=>!!e&&r.indexOf(e)===t).join(" ")};/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var o={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let l=(0,a.forwardRef)((e,t)=>{let{color:r="currentColor",size:n=24,strokeWidth:l=2,absoluteStrokeWidth:c,className:i="",children:u,iconNode:d,...h}=e;return(0,a.createElement)("svg",{ref:t,...o,width:n,height:n,stroke:r,strokeWidth:c?24*Number(l)/Number(n):l,className:s("lucide",i),...h},[...d.map(e=>{let[t,r]=e;return(0,a.createElement)(t,r)}),...Array.isArray(u)?u:[u]])}),c=(e,t)=>{let r=(0,a.forwardRef)((r,o)=>{let{className:c,...i}=r;return(0,a.createElement)(l,{ref:o,iconNode:t,className:s("lucide-".concat(n(e)),c),...i})});return r.displayName="".concat(e),r}},74232:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(78030).Z)("Building2",[["path",{d:"M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z",key:"1b4qmf"}],["path",{d:"M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2",key:"i71pzd"}],["path",{d:"M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2",key:"10jefs"}],["path",{d:"M10 6h4",key:"1itunk"}],["path",{d:"M10 10h4",key:"tcdvrf"}],["path",{d:"M10 14h4",key:"kelpxr"}],["path",{d:"M10 18h4",key:"1ulq68"}]])},70518:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(78030).Z)("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]])},24258:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(78030).Z)("Settings",[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",key:"1qme2f"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]])},20500:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(78030).Z)("Shield",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]])},11240:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(78030).Z)("Users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]])},16463:function(e,t,r){"use strict";var a=r(71169);r.o(a,"useParams")&&r.d(t,{useParams:function(){return a.useParams}}),r.o(a,"usePathname")&&r.d(t,{usePathname:function(){return a.usePathname}}),r.o(a,"useRouter")&&r.d(t,{useRouter:function(){return a.useRouter}}),r.o(a,"useSearchParams")&&r.d(t,{useSearchParams:function(){return a.useSearchParams}})}},function(e){e.O(0,[7138,2971,7023,1744],function(){return e(e.s=22098)}),_N_E=e.O()}]);