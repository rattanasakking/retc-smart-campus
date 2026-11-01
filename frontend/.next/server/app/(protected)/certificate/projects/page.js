(()=>{var e={};e.id=1402,e.ids=[1402],e.modules={47849:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external")},72934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},55403:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external")},54580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},94749:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external")},45869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},71017:e=>{"use strict";e.exports=require("path")},57310:e=>{"use strict";e.exports=require("url")},72310:(e,t,a)=>{"use strict";a.r(t),a.d(t,{GlobalError:()=>l.a,__next_app__:()=>p,originalPathname:()=>h,pages:()=>o,routeModule:()=>u,tree:()=>d}),a(85203),a(34896),a(35866),a(63722);var s=a(23191),r=a(88716),i=a(37922),l=a.n(i),c=a(95231),n={};for(let e in c)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(n[e]=()=>c[e]);a.d(t,n);let d=["",{children:["(protected)",{children:["certificate",{children:["projects",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(a.bind(a,85203)),"C:\\Users\\Rattanasak Phasuk\\retc-smart-campus\\frontend\\app\\(protected)\\certificate\\projects\\page.tsx"]}]},{}]},{}]},{layout:[()=>Promise.resolve().then(a.bind(a,34896)),"C:\\Users\\Rattanasak Phasuk\\retc-smart-campus\\frontend\\app\\(protected)\\layout.tsx"],"not-found":[()=>Promise.resolve().then(a.t.bind(a,35866,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(a.bind(a,24697))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(a.bind(a,63722)),"C:\\Users\\Rattanasak Phasuk\\retc-smart-campus\\frontend\\app\\layout.tsx"],"not-found":[()=>Promise.resolve().then(a.t.bind(a,35866,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(a.bind(a,24697))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}],o=["C:\\Users\\Rattanasak Phasuk\\retc-smart-campus\\frontend\\app\\(protected)\\certificate\\projects\\page.tsx"],h="/(protected)/certificate/projects/page",p={require:a,loadChunk:()=>Promise.resolve()},u=new s.AppPageRouteModule({definition:{kind:r.x.APP_PAGE,page:"/(protected)/certificate/projects/page",pathname:"/certificate/projects",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:d}})},92321:(e,t,a)=>{Promise.resolve().then(a.bind(a,43856))},43856:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>x});var s=a(10326),r=a(17577),i=a(90434),l=a(49163),c=a(83855),n=a(44389),d=a(77506),o=a(98091),h=a(24061),p=a(6824),u=a(70416);function x(){let[e,t]=(0,r.useState)([]),[a,x]=(0,r.useState)(!0),[y,m]=(0,r.useState)(!1),[f,k]=(0,r.useState)(null),g=()=>{x(!0),p.hi.get("/certificate/projects").then(e=>t(e.data??[])).catch(()=>{}).finally(()=>x(!1))},v=async e=>{if(confirm(`ลบรูปแบบ "${e.name}"?
(เกียรติบัตรทั้งหมดในรูปแบบนี้จะถูกลบด้วย)`)){k(e.id);try{await p.hi.delete(`/certificate/projects/${e.id}`),g()}catch(e){alert(e.message)}finally{k(null)}}};return(0,s.jsxs)("div",{className:"md:p-6 space-y-4",children:[(0,s.jsxs)("div",{className:"flex items-center justify-between flex-wrap gap-3",children:[(0,s.jsxs)("h1",{className:"text-xl font-bold text-gray-800 flex items-center gap-2",children:[s.jsx(l.Z,{size:20,style:{color:"#c2410c"}})," รูปแบบเกียรติบัตร"]}),y&&(0,s.jsxs)(i.default,{href:"/certificate/projects/new",className:"flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700",children:[s.jsx(c.Z,{size:16})," สร้างรูปแบบใหม่"]})]}),s.jsx(u.Z,{}),a?s.jsx("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-5",children:[1,2,3].map(e=>s.jsx("div",{className:"skeleton h-64 rounded-2xl"},e))}):0===e.length?(0,s.jsxs)("div",{className:"py-16 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300",children:[s.jsx(l.Z,{size:40,className:"mx-auto mb-3 text-slate-300"}),(0,s.jsxs)("p",{children:["ยังไม่มีรูปแบบเกียรติบัตร",y?' — กด "สร้างรูปแบบใหม่"':" ที่คุณเข้าถึงได้"]})]}):s.jsx("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-5",children:e.map(e=>(0,s.jsxs)("div",{className:"bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col group",children:[(0,s.jsxs)("div",{className:"h-44 bg-slate-100 relative overflow-hidden flex items-center justify-center",children:[s.jsx("img",{src:e.templateUrl,alt:e.name,className:"w-full h-full group-hover:scale-105 transition duration-500",style:{objectFit:"fill"}}),(0,s.jsxs)("div",{className:"absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition",children:[s.jsx(i.default,{href:`/certificate/projects/${e.id}`,className:"bg-white text-blue-600 w-9 h-9 rounded-full shadow flex items-center justify-center hover:bg-blue-50",title:"แก้ไข",children:s.jsx(n.Z,{size:15})}),y&&s.jsx("button",{onClick:()=>v(e),disabled:f===e.id,className:"bg-white text-red-600 w-9 h-9 rounded-full shadow flex items-center justify-center hover:bg-red-50",title:"ลบ",children:f===e.id?s.jsx(d.Z,{size:15,className:"animate-spin"}):s.jsx(o.Z,{size:15})})]})]}),(0,s.jsxs)("div",{className:"p-4 border-t border-slate-100 flex-grow",children:[s.jsx("h3",{className:"font-bold text-slate-800 line-clamp-2 mb-1",children:e.name}),(0,s.jsxs)("p",{className:"text-sm text-slate-500 flex items-center gap-1.5",children:[s.jsx(h.Z,{size:13})," ออกแล้ว ",e.certCount," ใบ"]})]})]},e.id))})]})}},70416:(e,t,a)=>{"use strict";a.d(t,{Z:()=>u});var s=a(10326),r=a(90434),i=a(35047),l=a(17577),c=a(24319),n=a(49163),d=a(49423),o=a(16525),h=a(36283);a(6824);let p=[{href:"/certificate",label:"ภาพรวม",Icon:c.Z,adminOnly:!1,exact:!0},{href:"/certificate/projects",label:"โครงการ",Icon:n.Z,adminOnly:!1,exact:!1},{href:"/certificate/series",label:"เลขชุด",Icon:d.Z,adminOnly:!0,exact:!1},{href:"/certificate/certs",label:"ออกเกียรติบัตร",Icon:o.Z,adminOnly:!1,exact:!1},{href:"/certificate/reports",label:"รายงาน",Icon:h.Z,adminOnly:!1,exact:!1}];function u(){let e=(0,i.usePathname)(),[t,a]=(0,l.useState)(!1);return s.jsx("div",{className:"bg-white rounded-xl",style:{border:"1px solid #dce6f9"},children:s.jsx("div",{className:"flex overflow-x-auto",children:p.filter(e=>!e.adminOnly||t).map(({href:t,label:a,Icon:i,exact:l})=>{let c=l?e===t:e.startsWith(t);return(0,s.jsxs)(r.default,{href:t,className:"flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors flex-shrink-0",style:{borderBottomColor:c?"#c2410c":"transparent",color:c?"#c2410c":"#4a6080"},onMouseEnter:e=>{c||(e.currentTarget.style.color="#1a2744")},onMouseLeave:e=>{c||(e.currentTarget.style.color="#4a6080")},children:[s.jsx(i,{className:"w-4 h-4 flex-shrink-0"}),s.jsx("span",{children:a})]},t)})})})}},6507:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
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
 */let s=(0,a(62881).Z)("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]])},39183:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]])},36283:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("FileText",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]])},49423:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("Hash",[["line",{x1:"4",x2:"20",y1:"9",y2:"9",key:"4lhtct"}],["line",{x1:"4",x2:"20",y1:"15",y2:"15",key:"vyu0kd"}],["line",{x1:"10",x2:"8",y1:"3",y2:"21",key:"1ggp8o"}],["line",{x1:"16",x2:"14",y1:"3",y2:"21",key:"weycgp"}]])},29798:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("House",[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"1d0kgt"}]])},49163:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("Layers",[["path",{d:"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",key:"8b97xw"}],["path",{d:"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65",key:"dd6zsq"}],["path",{d:"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65",key:"ep9fru"}]])},77506:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
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
 */let s=(0,a(62881).Z)("Menu",[["line",{x1:"4",x2:"20",y1:"12",y2:"12",key:"1e0a9i"}],["line",{x1:"4",x2:"20",y1:"6",y2:"6",key:"1owob3"}],["line",{x1:"4",x2:"20",y1:"18",y2:"18",key:"yk5zj1"}]])},44389:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("Pencil",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}],["path",{d:"m15 5 4 4",key:"1mk7zo"}]])},83855:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]])},92447:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("QrCode",[["rect",{width:"5",height:"5",x:"3",y:"3",rx:"1",key:"1tu5fj"}],["rect",{width:"5",height:"5",x:"16",y:"3",rx:"1",key:"1v8r4q"}],["rect",{width:"5",height:"5",x:"3",y:"16",rx:"1",key:"1x03jg"}],["path",{d:"M21 16h-3a2 2 0 0 0-2 2v3",key:"177gqh"}],["path",{d:"M21 21v.01",key:"ents32"}],["path",{d:"M12 7v3a2 2 0 0 1-2 2H7",key:"8crl2c"}],["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M12 3h.01",key:"n36tog"}],["path",{d:"M12 16v.01",key:"133mhm"}],["path",{d:"M16 12h1",key:"1slzba"}],["path",{d:"M21 12v.01",key:"1lwtk9"}],["path",{d:"M12 21v-1",key:"1880an"}]])},88378:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("Settings",[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",key:"1qme2f"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]])},16525:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("Stamp",[["path",{d:"M5 22h14",key:"ehvnwv"}],["path",{d:"M19.27 13.73A2.5 2.5 0 0 0 17.5 13h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-.66-.26-1.3-.73-1.77Z",key:"1sy9ra"}],["path",{d:"M14 13V8.5C14 7 15 7 15 5a3 3 0 0 0-3-3c-1.66 0-3 1-3 3s1 2 1 3.5V13",key:"cnxgux"}]])},98091:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]])},79635:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(62881).Z)("User",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]])},35047:(e,t,a)=>{"use strict";var s=a(77389);a.o(s,"useParams")&&a.d(t,{useParams:function(){return s.useParams}}),a.o(s,"usePathname")&&a.d(t,{usePathname:function(){return s.usePathname}}),a.o(s,"useRouter")&&a.d(t,{useRouter:function(){return s.useRouter}}),a.o(s,"useSearchParams")&&a.d(t,{useSearchParams:function(){return s.useSearchParams}})},85203:(e,t,a)=>{"use strict";a.r(t),a.d(t,{$$typeof:()=>l,__esModule:()=>i,default:()=>c});var s=a(68570);let r=(0,s.createProxy)(String.raw`C:\Users\Rattanasak Phasuk\retc-smart-campus\frontend\app\(protected)\certificate\projects\page.tsx`),{__esModule:i,$$typeof:l}=r;r.default;let c=(0,s.createProxy)(String.raw`C:\Users\Rattanasak Phasuk\retc-smart-campus\frontend\app\(protected)\certificate\projects\page.tsx#default`)}};var t=require("../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),s=t.X(0,[8948,4471,6621,8653,2172],()=>a(72310));module.exports=s})();