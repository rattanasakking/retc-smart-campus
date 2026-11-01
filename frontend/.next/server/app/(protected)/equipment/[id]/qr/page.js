(()=>{var e={};e.id=2437,e.ids=[2437],e.modules={47849:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external")},72934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},55403:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external")},54580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},94749:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external")},45869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},71017:e=>{"use strict";e.exports=require("path")},57310:e=>{"use strict";e.exports=require("url")},31359:(e,t,a)=>{"use strict";a.r(t),a.d(t,{GlobalError:()=>i.a,__next_app__:()=>p,originalPathname:()=>u,pages:()=>d,routeModule:()=>h,tree:()=>c}),a(34636),a(97489),a(34896),a(35866),a(63722);var s=a(23191),r=a(88716),n=a(37922),i=a.n(n),l=a(95231),o={};for(let e in l)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(o[e]=()=>l[e]);a.d(t,o);let c=["",{children:["(protected)",{children:["equipment",{children:["[id]",{children:["qr",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(a.bind(a,34636)),"C:\\Users\\Rattanasak Phasuk\\retc-smart-campus\\frontend\\app\\(protected)\\equipment\\[id]\\qr\\page.tsx"]}]},{}]},{}]},{layout:[()=>Promise.resolve().then(a.bind(a,97489)),"C:\\Users\\Rattanasak Phasuk\\retc-smart-campus\\frontend\\app\\(protected)\\equipment\\layout.tsx"]}]},{layout:[()=>Promise.resolve().then(a.bind(a,34896)),"C:\\Users\\Rattanasak Phasuk\\retc-smart-campus\\frontend\\app\\(protected)\\layout.tsx"],"not-found":[()=>Promise.resolve().then(a.t.bind(a,35866,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(a.bind(a,24697))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(a.bind(a,63722)),"C:\\Users\\Rattanasak Phasuk\\retc-smart-campus\\frontend\\app\\layout.tsx"],"not-found":[()=>Promise.resolve().then(a.t.bind(a,35866,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(a.bind(a,24697))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}],d=["C:\\Users\\Rattanasak Phasuk\\retc-smart-campus\\frontend\\app\\(protected)\\equipment\\[id]\\qr\\page.tsx"],u="/(protected)/equipment/[id]/qr/page",p={require:a,loadChunk:()=>Promise.resolve()},h=new s.AppPageRouteModule({definition:{kind:r.x.APP_PAGE,page:"/(protected)/equipment/[id]/qr/page",pathname:"/equipment/[id]/qr",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:c}})},83901:(e,t,a)=>{Promise.resolve().then(a.bind(a,21075))},95945:(e,t,a)=>{Promise.resolve().then(a.bind(a,29136))},21075:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>h});var s=a(10326),r=a(17577),n=a(35047),i=a(77506),l=a(11890),o=a(92447),c=a(3869),d=a(31540),u=a(6824);let p=e=>`https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=20&format=png&data=${encodeURIComponent(`https://app.retc.ac.th/equipment/${e}`)}`;function h(){let e=(0,n.useRouter)(),{id:t}=(0,n.useParams)(),[a,h]=(0,r.useState)(null),[m,y]=(0,r.useState)(!0),[x,f]=(0,r.useState)(!1),k=(0,r.useRef)(null);(0,r.useCallback)(async()=>{try{let e=await u.hi.get(`/equipment/${t}`);h(e.data)}catch{}finally{y(!1)}},[t]);let g=async()=>{try{let e=await fetch(p(t)),s=await e.blob(),r=URL.createObjectURL(s),n=document.createElement("a");n.href=r,n.download=`qr-${a?.code??t}.png`,n.click(),URL.revokeObjectURL(r)}catch{}};return m?(0,s.jsxs)("div",{className:"flex items-center justify-center h-64 gap-3",style:{color:"#94a3b8"},children:[s.jsx(i.Z,{className:"w-6 h-6 animate-spin"})," กำลังโหลด..."]}):(0,s.jsxs)(s.Fragment,{children:[s.jsx("style",{children:`
        @media print {
          body > * { display: none !important; }
          #qr-print-area { display: flex !important; }
        }
        #qr-print-area { display: none; }
      `}),(0,s.jsxs)("div",{className:"max-w-md mx-auto space-y-4",children:[(0,s.jsxs)("div",{className:"flex items-center gap-3",children:[s.jsx("button",{onClick:()=>e.back(),className:"p-2 rounded-xl hover:bg-[#f5f8ff] transition-colors",children:s.jsx(l.Z,{className:"w-4 h-4",style:{color:"#4a6080"}})}),s.jsx("h1",{className:"text-xl font-bold",style:{color:"#1a2744"},children:"QR Code ครุภัณฑ์"})]}),(0,s.jsxs)("div",{className:"bg-white rounded-2xl p-8 text-center",style:{border:"1px solid #dce6f9"},children:[(0,s.jsxs)("div",{className:"flex items-center justify-center mb-6",children:[!x&&s.jsx("div",{className:"w-64 h-64 flex items-center justify-center rounded-xl",style:{backgroundColor:"#f5f8ff"},children:s.jsx(i.Z,{className:"w-8 h-8 animate-spin",style:{color:"#1d6ae5"}})}),s.jsx("img",{src:p(t),alt:"QR Code",className:`w-64 h-64 rounded-xl ${x?"":"hidden"}`,onLoad:()=>f(!0),style:{border:"1px solid #dce6f9"}})]}),(0,s.jsxs)("div",{className:"space-y-1",children:[(0,s.jsxs)("div",{className:"inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono mb-2",style:{backgroundColor:"#e8f0fe",color:"#1d6ae5"},children:[s.jsx(o.Z,{className:"w-3 h-3"}),a?.code??t]}),s.jsx("p",{className:"text-base font-semibold",style:{color:"#1a2744"},children:a?.name}),(0,s.jsxs)("p",{className:"text-sm",style:{color:"#4a6080"},children:[a?.category?.name??"",a?.department?` \xb7 ${a.department}`:""]}),s.jsx("p",{className:"text-xs mt-2",style:{color:"#94a3b8"},children:"สแกนเพื่อดูรายละเอียดครุภัณฑ์"})]})]}),(0,s.jsxs)("div",{className:"flex gap-3",children:[(0,s.jsxs)("button",{onClick:()=>window.print(),className:"flex-1 btn-secondary flex items-center justify-center gap-2",children:[s.jsx(c.Z,{className:"w-4 h-4"})," พิมพ์"]}),(0,s.jsxs)("button",{onClick:g,className:"flex-1 btn-primary flex items-center justify-center gap-2",children:[s.jsx(d.Z,{className:"w-4 h-4"})," ดาวน์โหลด PNG"]})]}),(0,s.jsxs)("p",{className:"text-center text-xs",style:{color:"#94a3b8"},children:["QR จะ link ไปยัง: https://app.retc.ac.th/equipment/",t]})]}),(0,s.jsxs)("div",{id:"qr-print-area",ref:k,style:{position:"fixed",inset:0,background:"#fff",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40},children:[s.jsx("img",{src:p(t),alt:"QR Code",style:{width:300,height:300}}),s.jsx("p",{style:{fontFamily:"sans-serif",fontSize:20,fontWeight:700,marginTop:16,color:"#0f1e3c"},children:a?.name}),s.jsx("p",{style:{fontFamily:"monospace",fontSize:14,marginTop:4,color:"#1d6ae5"},children:a?.code}),s.jsx("p",{style:{fontFamily:"sans-serif",fontSize:12,marginTop:4,color:"#4a6080"},children:a?.department})]})]})}},29136:(e,t,a)=>{"use strict";a.d(t,{default:()=>i});var s=a(10326),r=a(17577),n=a(35047);function i({module:e,children:t}){(0,n.useRouter)();let[a,i]=(0,r.useState)(null);return null===a?s.jsx("div",{className:"flex items-center justify-center h-48",children:s.jsx("div",{className:"w-8 h-8 border-4 rounded-full animate-spin",style:{borderColor:"#e8f0fe",borderTopColor:"#1d6ae5"}})}):s.jsx(s.Fragment,{children:t})}a(6824)},6507:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("Bell",[["path",{d:"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9",key:"1qo2s2"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0",key:"qgo35s"}]])},8122:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("CalendarDays",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M16 14h.01",key:"1gbofw"}],["path",{d:"M8 18h.01",key:"lrp35t"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M16 18h.01",key:"kzsmim"}]])},81536:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("Car",[["path",{d:"M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2",key:"5owen"}],["circle",{cx:"7",cy:"17",r:"2",key:"u2ysq9"}],["path",{d:"M9 17h6",key:"r8uit2"}],["circle",{cx:"17",cy:"17",r:"2",key:"axvx0g"}]])},67211:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("CheckCheck",[["path",{d:"M18 6 7 17l-5-5",key:"116fxf"}],["path",{d:"m22 10-7.5 7.5L13 16",key:"ke71qq"}]])},941:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]])},11890:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]])},39183:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]])},31540:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("Download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]])},29798:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("House",[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"1d0kgt"}]])},77506:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]])},71810:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("LogOut",[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}],["polyline",{points:"16 17 21 12 16 7",key:"1gabdz"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12",key:"1uyos4"}]])},52679:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("Megaphone",[["path",{d:"m3 11 18-5v12L3 14v-3z",key:"n962bs"}],["path",{d:"M11.6 16.8a3 3 0 1 1-5.8-1.6",key:"1yl0tm"}]])},90748:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("Menu",[["line",{x1:"4",x2:"20",y1:"12",y2:"12",key:"1e0a9i"}],["line",{x1:"4",x2:"20",y1:"6",y2:"6",key:"1owob3"}],["line",{x1:"4",x2:"20",y1:"18",y2:"18",key:"yk5zj1"}]])},3869:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("Printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]])},92447:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("QrCode",[["rect",{width:"5",height:"5",x:"3",y:"3",rx:"1",key:"1tu5fj"}],["rect",{width:"5",height:"5",x:"16",y:"3",rx:"1",key:"1v8r4q"}],["rect",{width:"5",height:"5",x:"3",y:"16",rx:"1",key:"1x03jg"}],["path",{d:"M21 16h-3a2 2 0 0 0-2 2v3",key:"177gqh"}],["path",{d:"M21 21v.01",key:"ents32"}],["path",{d:"M12 7v3a2 2 0 0 1-2 2H7",key:"8crl2c"}],["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M12 3h.01",key:"n36tog"}],["path",{d:"M12 16v.01",key:"133mhm"}],["path",{d:"M16 12h1",key:"1slzba"}],["path",{d:"M21 12v.01",key:"1lwtk9"}],["path",{d:"M12 21v-1",key:"1880an"}]])},88378:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("Settings",[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",key:"1qme2f"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]])},79635:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("User",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]])},35047:(e,t,a)=>{"use strict";var s=a(77389);a.o(s,"useParams")&&a.d(t,{useParams:function(){return s.useParams}}),a.o(s,"usePathname")&&a.d(t,{usePathname:function(){return s.usePathname}}),a.o(s,"useRouter")&&a.d(t,{useRouter:function(){return s.useRouter}}),a.o(s,"useSearchParams")&&a.d(t,{useSearchParams:function(){return s.useSearchParams}})},34636:(e,t,a)=>{"use strict";a.r(t),a.d(t,{$$typeof:()=>i,__esModule:()=>n,default:()=>l});var s=a(68570);let r=(0,s.createProxy)(String.raw`C:\Users\Rattanasak Phasuk\retc-smart-campus\frontend\app\(protected)\equipment\[id]\qr\page.tsx`),{__esModule:n,$$typeof:i}=r;r.default;let l=(0,s.createProxy)(String.raw`C:\Users\Rattanasak Phasuk\retc-smart-campus\frontend\app\(protected)\equipment\[id]\qr\page.tsx#default`)},97489:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>n});var s=a(19510),r=a(22265);function n({children:e}){return s.jsx(r.ZP,{module:"EQUIPMENT",children:e})}},22265:(e,t,a)=>{"use strict";a.d(t,{ZP:()=>l});var s=a(68570);let r=(0,s.createProxy)(String.raw`C:\Users\Rattanasak Phasuk\retc-smart-campus\frontend\components\auth\ModuleGuard.tsx`),{__esModule:n,$$typeof:i}=r;r.default,(0,s.createProxy)(String.raw`C:\Users\Rattanasak Phasuk\retc-smart-campus\frontend\components\auth\ModuleGuard.tsx#clearModuleCache`);let l=(0,s.createProxy)(String.raw`C:\Users\Rattanasak Phasuk\retc-smart-campus\frontend\components\auth\ModuleGuard.tsx#default`)}};var t=require("../../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),s=t.X(0,[8948,4471,6621,8653,2172],()=>a(31359));module.exports=s})();