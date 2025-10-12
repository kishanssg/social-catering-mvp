import{b as s}from"./api.js";const o=async e=>(await s.get("/workers",{params:{query:e?.search,status:void 0}})).data,n=async e=>(await s.get(`/workers/${e}`)).data,i=async(e,r)=>(await s.post(`/workers/${e}/certifications`,r)).data,c=async(e,r)=>(await s.delete(`/workers/${e}/certifications/${r}`)).data;export{i as a,o as b,n as g,c as r};
//# sourceMappingURL=workersApi.js.map
