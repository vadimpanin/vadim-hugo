/**
 * VADIM.AI — Floating Poster + Orbit Menu
 * Handles parallax, mobile toggle, and keyboard navigation
 */

(function() {
  'use strict';

  // DOM Elements
  const hub = document.querySelector('.hub');
  const trigger = document.getElementById('logoTrigger');
  const menu = document.getElementById('navMenu');
  const navLinks = menu.querySelectorAll('.nav-link');
  const poster = document.getElementById('poster');
  const logoMark = document.querySelector('.logo-mark');
  
  // State
  let isOpen = false;
  let isManuallyOpened = false; // Track if opened by click vs proximity
  let isTouchDevice = false;
  
  // Parallax settings
  const parallaxConfig = {
    maxTiltX: 15,      // Max rotation on X axis (degrees)
    maxTiltY: 8,       // Max rotation on Y axis (degrees)
    baseTiltX: 12,     // Default tilt when centered
    baseTiltY: 0,      // Default tilt when centered
    smoothing: 0.08,   // Lerp factor (lower = smoother)
    enabled: true
  };
  
  // Current parallax state
  let currentTiltX = parallaxConfig.baseTiltX;
  let currentTiltY = parallaxConfig.baseTiltY;
  let targetTiltX = parallaxConfig.baseTiltX;
  let targetTiltY = parallaxConfig.baseTiltY;
  let animationId = null;

  // ============================================
  // Touch Detection
  // ============================================
  
  function detectTouch() {
    isTouchDevice = 'ontouchstart' in window || 
                    navigator.maxTouchPoints > 0 || 
                    window.matchMedia('(pointer: coarse)').matches;
    
    // Disable parallax on touch devices for performance
    parallaxConfig.enabled = !isTouchDevice;
  }

  // ============================================
  // Menu State Management
  // ============================================
  
  function openMenu(manual = false) {
    isOpen = true;
    isManuallyOpened = manual;
    hub.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    isOpen = false;
    isManuallyOpened = false;
    hub.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
  }

  function toggleMenu() {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu(true); // Mark as manually opened
    }
  }

  /**
   * Check distance from mouse to logo center and activate menu if close
   */
  function checkProximityActivation(e) {
    if (isTouchDevice || isManuallyOpened) return;

    const logoRect = trigger.getBoundingClientRect();
    const logoCenterX = logoRect.left + logoRect.width / 2;
    const logoCenterY = logoRect.top + logoRect.height / 2;

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const distance = Math.sqrt(
      Math.pow(mouseX - logoCenterX, 2) + Math.pow(mouseY - logoCenterY, 2)
    );

    let orbitRadius = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--orbit-radius')) || 220;
    orbitRadius *= 1.2; // Expand the activation zone slightly

    if (distance <= orbitRadius && !isOpen) {
      openMenu(false); // Proximity activation
    } else if (distance > orbitRadius && isOpen && !isManuallyOpened) {
      closeMenu(); // Proximity deactivation
    }
  }

  // ============================================
  // Event Handlers
  // ============================================
  
  function handleTriggerClick(e) {
    e.preventDefault();
    toggleMenu();
  }

  function handleKeydown(e) {
    // Escape closes menu
    if (e.key === 'Escape' && isOpen) {
      closeMenu();
      trigger.focus();
      return;
    }

    // Enter/Space on trigger toggles menu
    if ((e.key === 'Enter' || e.key === ' ') && e.target === trigger) {
      e.preventDefault();
      toggleMenu();
      
      // Focus first link when opening
      if (isOpen && navLinks.length > 0) {
        setTimeout(() => navLinks[0].focus(), 50);
      }
    }
  }

  function handleClickOutside(e) {
    if (!isOpen) return;
    
    const isOutside = !trigger.contains(e.target) && !menu.contains(e.target);
    
    if (isOutside) {
      closeMenu();
    }
  }

  function handleLinkClick() {
    setTimeout(closeMenu, 100);
  }

  function handleFocusOut(e) {
    if (!hub.contains(e.relatedTarget)) {
      closeMenu();
    }
  }

  // ============================================
  // Parallax Effect
  // ============================================
  
  function handleMouseMove(e) {
    if (!parallaxConfig.enabled || !poster) return;

    // Get mouse position relative to viewport center (-0.5 to 0.5)
    const x = (e.clientX / window.innerWidth) - 0.5;
    const y = (e.clientY / window.innerHeight) - 0.5;

    // Calculate target tilt
    // Mouse moving right -> poster tilts left (negative Y rotation)
    // Mouse moving down -> poster tilts back (positive X rotation)
    targetTiltX = parallaxConfig.baseTiltX + (y * parallaxConfig.maxTiltX);
    targetTiltY = parallaxConfig.baseTiltY + (-x * parallaxConfig.maxTiltY);

    // Check proximity activation for navigation menu
    checkProximityActivation(e);
  }
  
  function handleMouseLeave() {
    if (!parallaxConfig.enabled) return;
    
    // Return to base tilt
    targetTiltX = parallaxConfig.baseTiltX;
    targetTiltY = parallaxConfig.baseTiltY;
  }
  
  function handleDeviceOrientation(e) {
    if (!parallaxConfig.enabled || !poster) return;
    
    // Use device tilt (beta = front-back, gamma = left-right)
    const beta = e.beta;   // -180 to 180 (front-back tilt)
    const gamma = e.gamma; // -90 to 90 (left-right tilt)
    
    if (beta === null || gamma === null) return;
    
    // Normalize to reasonable range
    const normalizedBeta = Math.max(-45, Math.min(45, beta)) / 45;
    const normalizedGamma = Math.max(-45, Math.min(45, gamma)) / 45;
    
    targetTiltX = parallaxConfig.baseTiltX + (normalizedBeta * parallaxConfig.maxTiltX * 0.5);
    targetTiltY = parallaxConfig.baseTiltY + (normalizedGamma * parallaxConfig.maxTiltY * 0.5);
  }
  
  function updateParallax() {
    if (!poster) return;

    // Lerp towards target (smooth interpolation)
    currentTiltX += (targetTiltX - currentTiltX) * parallaxConfig.smoothing;
    currentTiltY += (targetTiltY - currentTiltY) * parallaxConfig.smoothing;

    // Apply transform to poster
    poster.style.transform = `
      rotateX(${currentTiltX}deg)
      rotateY(${currentTiltY}deg)
      translateZ(-100px)
    `;

    // Apply inverse transform to logo (counter-movement)
    if (logoMark) {
      logoMark.style.transform = `
        //translateY(66%)
        rotateX(${-currentTiltX}deg)
        rotateY(${-currentTiltY}deg)
        translateZ(100px)
      `;
    }

    // Apply inverse transform to nav menu (same as logo)
    if (menu) {
      menu.style.transform = `
        //translateY(66%)
        rotateX(${-currentTiltX}deg)
        rotateY(${-currentTiltY}deg)
        translateZ(200px)
      `;
    }

    // Continue animation loop
    animationId = requestAnimationFrame(updateParallax);
  }
  
  function startParallax() {
    if (animationId) return;
    animationId = requestAnimationFrame(updateParallax);
  }
  
  function stopParallax() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  // ============================================
  // Reduced Motion Check
  // ============================================
  
  function checkReducedMotion() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    parallaxConfig.enabled = !prefersReducedMotion && !isTouchDevice;
    
    if (!parallaxConfig.enabled) {
      stopParallax();
      if (poster) {
        poster.style.transform = '';
      }
    }
  }

  // ============================================
  // Initialize
  // ============================================
  
  function init() {
    detectTouch();
    checkReducedMotion();

    // Menu interactions
    trigger.addEventListener('click', handleTriggerClick);
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('click', handleClickOutside);
    hub.addEventListener('focusout', handleFocusOut);
    
    navLinks.forEach(link => {
      link.addEventListener('click', handleLinkClick);
    });

    // Parallax
    if (parallaxConfig.enabled && poster) {
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseleave', handleMouseLeave, { passive: true });
      
      // Device orientation for mobile (if supported)
      if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
      }
      
      startParallax();
    }

    // Handle resize and motion preference changes
    window.addEventListener('resize', detectTouch, { passive: true });
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', checkReducedMotion);
    
    // Cleanup on page hide
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopParallax();
      } else if (parallaxConfig.enabled) {
        startParallax();
      }
    });
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
