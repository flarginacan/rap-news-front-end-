"use client";

import { useEffect } from 'react';

/**
 * Global Getty Images Widget Loader
 * 
 * CRITICAL: This is the ONLY place widgets.js should be loaded.
 * All other components should use this loader, not load widgets.js themselves.
 * 
 * Responsibilities:
 * 1. Load widgets.js EXACTLY ONCE globally
 * 2. Guard: Clean window.gie if it's not a function (before widgets.js loads)
 * 3. After widgets.js loads, re-scan for embeds
 */
export default function GlobalGettyLoader() {
  useEffect(() => {
    // GUARD: Clean window.gie if it exists and is not a function
    // This prevents conflicts from WordPress inline scripts or other sources
    if (typeof window !== 'undefined') {
      // CRITICAL: Clean window.gie if it's not a function (before anything else)
      if (window.gie && typeof window.gie !== 'function') {
        console.warn('GlobalGettyLoader: window.gie exists but is not a function, cleaning it')
        try {
          delete (window as any).gie
        } catch (e) {
          (window as any).gie = undefined
        }
      }
      
      // CRITICAL: If window.gie exists as a function but q contains non-functions, clean it
      if (window.gie && typeof window.gie === 'function' && window.gie.q && Array.isArray(window.gie.q)) {
        const hasNonFunctions = window.gie.q.some((item: any) => typeof item !== 'function')
        if (hasNonFunctions) {
          console.warn('GlobalGettyLoader: window.gie.q contains non-functions, cleaning queue')
          window.gie.q = window.gie.q.filter((item: any) => typeof item === 'function')
        }
      }
      
      // Ensure window.gie is the canonical queue function
      if (!window.gie || typeof window.gie !== 'function') {
        window.gie = function(c: any) {
          // CRITICAL: Only push functions, never objects or other values
          if (typeof c === 'function') {
            (window.gie.q = window.gie.q || []).push(c)
          } else {
            console.error('GlobalGettyLoader: Attempted to push non-function into window.gie.q:', typeof c, c)
          }
        }
        console.log('GlobalGettyLoader: Installed window.gie queue shim with function guard')
      }
    }

    // Load widgets.js EXACTLY ONCE globally
    const scriptId = 'getty-widgets-script-global'
    let script = document.getElementById(scriptId) as HTMLScriptElement

    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://embed-cdn.gettyimages.com/widgets.js'
      script.async = true
      script.charset = 'utf-8'
      
      script.onload = () => {
        console.log('GlobalGettyLoader: widgets.js loaded successfully')
        
        // After widgets.js loads, re-scan for embeds
        if (window.gie && window.gie.widgets && typeof window.gie.widgets.load === 'function') {
          // Wait a bit for DOM to be ready
          setTimeout(() => {
            console.log('GlobalGettyLoader: Re-scanning for Getty embeds')
            try {
              window.gie.widgets.load()
              console.log('GlobalGettyLoader: Re-scan complete')
            } catch (e) {
              console.error('GlobalGettyLoader: Error during re-scan:', e)
            }
          }, 100)
        } else {
          console.warn('GlobalGettyLoader: widgets.load not available after script load')
        }
      }
      
      script.onerror = () => {
        console.error('GlobalGettyLoader: Failed to load widgets.js')
      }
      
      // Load in <head> for better initialization
      document.head.appendChild(script)
      console.log('GlobalGettyLoader: Loading widgets.js in <head>')
    } else {
      console.log('GlobalGettyLoader: widgets.js script already exists')
      
      // If script already exists, check if widgets is ready and re-scan
      if (window.gie?.widgets?.load && typeof window.gie.widgets.load === 'function') {
        setTimeout(() => {
          console.log('GlobalGettyLoader: widgets.js already loaded, re-scanning')
          try {
            window.gie.widgets.load()
          } catch (e) {
            console.error('GlobalGettyLoader: Error during re-scan:', e)
          }
        }, 100)
      }
    }
  }, [])

  return null
}
