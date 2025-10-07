import React from 'react'

export default function Login() {
  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold">Login</h1>
      <p className="text-sm text-slate-600 mt-2">If you can see this, routing and Tailwind work.</p>
      <form className="mt-6 space-y-4">
        <input className="w-full border border-slate-300 rounded-md px-3 py-2" placeholder="Email" />
        <input className="w-full border border-slate-300 rounded-md px-3 py-2" placeholder="Password" type="password" />
        <button type="button" className="w-full bg-slate-900 text-white rounded-md py-2">Sign in</button>
      </form>
    </div>
  )
}


