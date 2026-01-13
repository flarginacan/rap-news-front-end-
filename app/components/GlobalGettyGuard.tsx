"use client";

/**
 * Global Getty Guard - Runs BEFORE any content renders
 * 
 * This script runs immediately to protect window.gie from being corrupted
 * by WordPress inline scripts that might execute via dangerouslySetInnerHTML
 */
export default function GlobalGettyGuard() {
  if (typeof window !== 'undefined') {
    // Run immediately (not in useEffect) to catch scripts that execute during render
    (function() {
      // CRITICAL: Clean window.gie if it exists and is not a function
      if (window.gie && typeof window.gie !== 'function') {
        console.warn('GlobalGettyGuard: window.gie is not a function, cleaning it')
        try {
          delete (window as any).gie
        } catch (e) {
          (window as any).gie = undefined
        }
      }
      
      // CRITICAL: Clean window.gie.q if it contains non-functions
      if (window.gie && typeof window.gie === 'function' && window.gie.q && Array.isArray(window.gie.q)) {
        const originalLength = window.gie.q.length
        window.gie.q = window.gie.q.filter((item: any) => typeof item === 'function')
        if (window.gie.q.length !== originalLength) {
          console.warn(`GlobalGettyGuard: Removed ${originalLength - window.gie.q.length} non-functions from window.gie.q`)
        }
      }
      
      // Ensure window.gie is the canonical queue function with guard
      if (!window.gie || typeof window.gie !== 'function') {
        window.gie = function(c: any) {
          // CRITICAL: Only push functions, never objects or other values
          if (typeof c === 'function') {
            (window.gie.q = window.gie.q || []).push(c)
          } else {
            console.error('GlobalGettyGuard: Blocked attempt to push non-function into window.gie.q:', typeof c, c)
          }
        }
      }
    })()
  }
  
  return null
}
