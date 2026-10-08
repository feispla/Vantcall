// ============================================
// Vercel Web Analytics Integration
// ============================================
// This file provides analytics initialization for the VANTS platform.
// Analytics data is collected when deployed to Vercel with Web Analytics enabled.
//
// For local development or non-Vercel deployments, the analytics will not be sent.
// To enable in production: https://vercel.com/docs/analytics/quickstart

(function() {
  'use strict';
  
  // Initialize Vercel Web Analytics
  // This creates the global tracking queue that will be picked up by Vercel's analytics script
  window.va = window.va || function () { 
    (window.vaq = window.vaq || []).push(arguments); 
  };
  
  // The analytics script is automatically injected by Vercel when:
  // 1. Web Analytics is enabled in your Vercel project dashboard
  // 2. The project is deployed to Vercel
  //
  // No additional configuration is required in the code.
  
  console.log('[Analytics] Vercel Web Analytics initialized and ready');
})();
