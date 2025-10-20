import{c as x,j as e}from"./index-CQO61As0.js";import{r as l,a as y}from"./vendor-D4VeuP1H.js";import{C as j,X as v}from"./x-circle-C6jvPktw.js";import{X as g}from"./x-BYk2HZYl.js";/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=x("AlertTriangle",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z",key:"c3ski4"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=x("Loader2",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=x("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I=x("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);function M({message:r,type:s,isVisible:o,onClose:d,duration:i=4e3}){const[u,m]=l.useState(o);if(l.useEffect(()=>{if(o){m(!0);const n=setTimeout(()=>{d()},i);return()=>clearTimeout(n)}else{const n=setTimeout(()=>{m(!1)},300);return()=>clearTimeout(n)}},[o,d,i]),!u)return null;const t=s==="success",c=t?j:v;return y.createPortal(e.jsxs("div",{className:`fixed top-6 right-6 z-[10001] transform transition-all duration-300 ${o?"translate-x-0 opacity-100":"translate-x-full opacity-0"}`,children:[e.jsxs("div",{className:`flex items-center gap-4 px-5 py-4 rounded-xl shadow-xl max-w-sm border ${t?"bg-green-50 border-green-200 text-green-800":"bg-red-50 border-red-200 text-red-800"}`,style:{boxShadow:"0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)",animation:o?"toastSlideIn 0.3s ease-out":"toastSlideOut 0.2s ease-in"},children:[e.jsx("div",{className:`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${t?"bg-green-100":"bg-red-100"}`,children:e.jsx(c,{className:`w-5 h-5 ${t?"text-green-600":"text-red-600"}`})}),e.jsx("p",{className:"text-sm font-semibold font-manrope flex-1 leading-relaxed",children:r}),e.jsx("button",{onClick:d,className:`flex-shrink-0 p-1.5 rounded-lg hover:bg-black/10 transition-all duration-200 ${t?"text-green-600 hover:text-green-700 hover:bg-green-100":"text-red-600 hover:text-red-700 hover:bg-red-100"}`,children:e.jsx(g,{className:"w-4 h-4"})})]}),e.jsx("style",{jsx:!0,children:`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(100%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        
        @keyframes toastSlideOut {
          from {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateX(100%) scale(0.95);
          }
        }
      `})]}),document.body)}function X({isOpen:r,onClose:s,onConfirm:o,title:d,message:i,confirmText:u="Delete",cancelText:m="Cancel",isLoading:t=!1,isDestructive:c=!0,workerName:n}){const h=l.useRef(null),f=l.useRef(null);l.useEffect(()=>(r?(f.current=document.activeElement,document.body.style.overflow="hidden",setTimeout(()=>{var a;(a=h.current)==null||a.focus()},0)):(document.body.style.overflow="unset",f.current&&f.current.focus()),()=>{document.body.style.overflow="unset"}),[r]),l.useEffect(()=>{const a=b=>{r&&b.key==="Escape"&&s()};return r&&document.addEventListener("keydown",a),()=>{document.removeEventListener("keydown",a)}},[r,s]);const p=a=>{a.target===a.currentTarget&&s()};return r?y.createPortal(e.jsxs("div",{className:"fixed inset-0 z-[10000] flex items-center justify-center p-4",style:{backgroundColor:"rgba(0, 0, 0, 0.6)"},onClick:p,children:[e.jsxs("div",{ref:h,className:"relative bg-white rounded-xl shadow-2xl max-w-md w-full",role:"dialog","aria-modal":"true","aria-labelledby":"modal-title","aria-describedby":"modal-description",tabIndex:-1,style:{boxShadow:"0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",animation:"modalSlideIn 0.2s ease-out"},children:[e.jsxs("div",{className:"flex items-center justify-between px-6 py-5 border-b border-gray-100",children:[e.jsxs("div",{className:"flex items-center gap-4",children:[c&&e.jsx("div",{className:"flex items-center justify-center w-12 h-12 rounded-full bg-orange-50 border border-orange-200",children:e.jsx(w,{className:"w-6 h-6 text-orange-600"})}),e.jsxs("div",{children:[e.jsx("h3",{id:"modal-title",className:"text-xl font-bold font-manrope text-gray-900 leading-tight",children:d}),e.jsx("p",{className:"text-sm text-gray-500 font-manrope mt-1",children:c?"This action cannot be undone":"Please confirm your action"})]})]}),e.jsx("button",{onClick:s,className:"flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200",disabled:t,children:e.jsx(g,{className:"w-5 h-5"})})]}),e.jsx("div",{className:"px-6 py-6",children:e.jsxs("p",{id:"modal-description",className:"text-gray-700 font-manrope leading-relaxed text-base",children:[i,n&&e.jsxs("span",{className:"font-bold text-gray-900",children:[" ",n]}),"?"]})}),e.jsxs("div",{className:"flex items-center justify-end gap-3 px-6 py-5 bg-gray-50 rounded-b-xl",children:[e.jsx("button",{onClick:s,disabled:t,className:"px-6 py-2.5 text-sm font-semibold font-manrope text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200",children:m}),e.jsxs("button",{onClick:o,disabled:t,className:`px-6 py-2.5 text-sm font-semibold font-manrope text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 ${c?"bg-red-600 hover:bg-red-700 focus:ring-red-500 shadow-sm hover:shadow-md":"bg-teal-600 hover:bg-teal-700 focus:ring-teal-500 shadow-sm hover:shadow-md"}`,children:[t&&e.jsx(k,{className:"w-4 h-4 animate-spin"}),u]})]})]}),e.jsx("style",{jsx:!0,children:`
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
      `})]}),document.body):null}export{w as A,X as C,C as S,M as T,I as a};
