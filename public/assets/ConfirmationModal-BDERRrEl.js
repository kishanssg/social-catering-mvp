import{c as n,j as e}from"./index-DtcAdi6M.js";import{r as o,a as p}from"./vendor-79DyBOV9.js";import{X as g}from"./Toast-CxgbxwJ3.js";/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=n("AlertTriangle",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z",key:"c3ski4"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=n("Loader2",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E=n("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const T=n("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);function M({isOpen:a,onClose:r,onConfirm:m,title:u,message:x,confirmText:f="Delete",cancelText:y="Cancel",isLoading:s=!1,isDestructive:l=!0,workerName:c}){const i=o.useRef(null),d=o.useRef(null);o.useEffect(()=>(a?(d.current=document.activeElement,document.body.style.overflow="hidden",setTimeout(()=>{var t;(t=i.current)==null||t.focus()},0)):(document.body.style.overflow="unset",d.current&&d.current.focus()),()=>{document.body.style.overflow="unset"}),[a]),o.useEffect(()=>{const t=b=>{a&&b.key==="Escape"&&r()};return a&&document.addEventListener("keydown",t),()=>{document.removeEventListener("keydown",t)}},[a,r]);const h=t=>{t.target===t.currentTarget&&r()};return a?p.createPortal(e.jsxs("div",{className:"fixed inset-0 z-[10000] flex items-center justify-center p-4",style:{backgroundColor:"rgba(0, 0, 0, 0.6)"},onClick:h,children:[e.jsxs("div",{ref:i,className:"relative bg-white rounded-xl shadow-2xl max-w-md w-full",role:"dialog","aria-modal":"true","aria-labelledby":"modal-title","aria-describedby":"modal-description",tabIndex:-1,style:{boxShadow:"0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",animation:"modalSlideIn 0.2s ease-out"},children:[e.jsxs("div",{className:"flex items-center justify-between px-6 py-5 border-b border-gray-100",children:[e.jsxs("div",{className:"flex items-center gap-4",children:[l&&e.jsx("div",{className:"flex items-center justify-center w-12 h-12 rounded-full bg-orange-50 border border-orange-200",children:e.jsx(j,{className:"w-6 h-6 text-orange-600"})}),e.jsxs("div",{children:[e.jsx("h3",{id:"modal-title",className:"text-xl font-bold font-manrope text-gray-900 leading-tight",children:u}),e.jsx("p",{className:"text-sm text-gray-500 font-manrope mt-1",children:l?"This action cannot be undone":"Please confirm your action"})]})]}),e.jsx("button",{onClick:r,className:"flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200",disabled:s,children:e.jsx(g,{className:"w-5 h-5"})})]}),e.jsx("div",{className:"px-6 py-6",children:e.jsxs("p",{id:"modal-description",className:"text-gray-700 font-manrope leading-relaxed text-base",children:[x,c&&e.jsxs("span",{className:"font-bold text-gray-900",children:[" ",c]})]})}),e.jsxs("div",{className:"flex items-center justify-end gap-3 px-6 py-5 bg-gray-50 rounded-b-xl",children:[e.jsx("button",{onClick:r,disabled:s,className:"px-6 py-2.5 text-sm font-semibold font-manrope text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200",children:y}),e.jsxs("button",{onClick:m,disabled:s,className:`px-6 py-2.5 text-sm font-semibold font-manrope text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 ${l?"bg-red-600 hover:bg-red-700 focus:ring-red-500 shadow-sm hover:shadow-md":"bg-teal-600 hover:bg-teal-700 focus:ring-teal-500 shadow-sm hover:shadow-md"}`,children:[s&&e.jsx(v,{className:"w-4 h-4 animate-spin"}),f]})]})]}),e.jsx("style",{children:`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `})]}),document.body):null}export{j as A,M as C,E as S,T};
