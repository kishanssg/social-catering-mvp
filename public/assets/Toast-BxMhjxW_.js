import{c as m,j as e}from"./index-BdqG2Bfe.js";import{r as l,a as u}from"./vendor-D4VeuP1H.js";import{C as f,X as p}from"./x-circle-CTnyyM6t.js";/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=m("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);function j({message:c,type:d,isVisible:t,onClose:a,duration:o=4e3}){const[i,n]=l.useState(t);if(l.useEffect(()=>{if(t){n(!0);const s=setTimeout(()=>{a()},o);return()=>clearTimeout(s)}else{const s=setTimeout(()=>{n(!1)},300);return()=>clearTimeout(s)}},[t,a,o]),!i)return null;const r=d==="success",x=r?f:p;return u.createPortal(e.jsxs("div",{className:`fixed top-6 right-6 z-[10001] transform transition-all duration-300 ${t?"translate-x-0 opacity-100":"translate-x-full opacity-0"}`,children:[e.jsxs("div",{className:`flex items-center gap-4 px-5 py-4 rounded-xl shadow-xl max-w-sm border ${r?"bg-green-50 border-green-200 text-green-800":"bg-red-50 border-red-200 text-red-800"}`,style:{boxShadow:"0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)",animation:t?"toastSlideIn 0.3s ease-out":"toastSlideOut 0.2s ease-in"},children:[e.jsx("div",{className:`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${r?"bg-green-100":"bg-red-100"}`,children:e.jsx(x,{className:`w-5 h-5 ${r?"text-green-600":"text-red-600"}`})}),e.jsx("p",{className:"text-sm font-semibold font-manrope flex-1 leading-relaxed",children:c}),e.jsx("button",{onClick:a,className:`flex-shrink-0 p-1.5 rounded-lg hover:bg-black/10 transition-all duration-200 ${r?"text-green-600 hover:text-green-700 hover:bg-green-100":"text-red-600 hover:text-red-700 hover:bg-red-100"}`,children:e.jsx(h,{className:"w-4 h-4"})})]}),e.jsx("style",{jsx:!0,children:`
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
      `})]}),document.body)}export{j as T,h as X};
