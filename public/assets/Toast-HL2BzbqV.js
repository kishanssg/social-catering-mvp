import{j as e,X as g}from"./index-gbdPgMi5.js";import{r as d,a as u}from"./vendor-79DyBOV9.js";import{C as f,X as h}from"./x-circle-Bh8QTCrf.js";function v({message:c,type:i,isVisible:r,onClose:a,duration:o=4e3,action:s}){const[x,l]=d.useState(r);if(d.useEffect(()=>{if(r){l(!0);const n=setTimeout(()=>{a()},o);return()=>clearTimeout(n)}else{const n=setTimeout(()=>{l(!1)},300);return()=>clearTimeout(n)}},[r,a,o]),!x)return null;const t=i==="success",m=t?f:h;return u.createPortal(e.jsxs("div",{className:`fixed top-6 right-6 z-[10001] transform transition-all duration-300 ${r?"translate-x-0 opacity-100":"translate-x-full opacity-0"}`,children:[e.jsxs("div",{className:`flex items-center gap-4 px-5 py-4 rounded-xl shadow-xl max-w-sm border ${t?"bg-green-50 border-green-200 text-green-800":"bg-red-50 border-red-200 text-red-800"}`,style:{boxShadow:"0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)",animation:r?"toastSlideIn 0.3s ease-out":"toastSlideOut 0.2s ease-in"},children:[e.jsx("div",{className:`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${t?"bg-green-100":"bg-red-100"}`,children:e.jsx(m,{className:`w-5 h-5 ${t?"text-green-600":"text-red-600"}`})}),e.jsx("p",{className:"text-sm font-semibold font-manrope flex-1 leading-relaxed",children:c}),e.jsxs("div",{className:"flex items-center gap-2",children:[s&&e.jsx("button",{onClick:s.onClick,className:`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${s.variant==="primary"?t?"bg-green-600 text-white hover:bg-green-700":"bg-red-600 text-white hover:bg-red-700":t?"bg-green-100 text-green-700 hover:bg-green-200":"bg-red-100 text-red-700 hover:bg-red-200"}`,children:s.label}),e.jsx("button",{onClick:a,className:`flex-shrink-0 p-1.5 rounded-lg hover:bg-black/10 transition-all duration-200 ${t?"text-green-600 hover:text-green-700 hover:bg-green-100":"text-red-600 hover:text-red-700 hover:bg-red-100"}`,children:e.jsx(g,{className:"w-4 h-4"})})]})]}),e.jsx("style",{children:`
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
      `})]}),document.body)}export{v as T};
