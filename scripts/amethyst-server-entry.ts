// The exported customer pages use classic React hooks, not React Server
// Components. Bundle their HTML renderer separately from Next's RSC compiler.
import React from 'react'
export { React }
export { renderToString } from 'react-dom/server.node'
