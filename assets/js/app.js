/**
 * Imports
 */

import List from "list.js";


(function() {

  'use strict';


  /**
   * Selectors
   */
  
  let primaryFilter = document.querySelector('[data-filter-primary]');
  let secondaryFilter = document.querySelector('[data-filter-secondary]');
  let filterItem = document.querySelectorAll('[data-filter]');
  let filterToggle = document.querySelector('[data-toggle="filter"]')
  let search = document.querySelectorAll('[data-search]');
  let themeToggle = document.querySelector('[data-theme-toggle]');
  let scrim = document.querySelector('[data-scrim]');


  /**
   * States
   */
  
  const activeClass = 'is-active';
  const inactiveClass = 'is-inactive';


  /**
   * Utils
   */

  window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function (callback) {
        window.setTimeout(callback, 1000 / 60);
      };
  })();


  /**
   * Settings
   */

  const listSettings = {
    // searchClass: 'search__input',
    valueNames: [
      'title',
      'category',
      'tag'
    ],
    pagination: true
  };


  const observerSettings = {
    rootMargin: '0px',
    threshold: 1.0
  };


  /**
   * Methods
   */

   
  // Handle click events
  const clickEventHandler = (e) => {

    // Filter toggle
    if (e.target.matches('[data-filter]')) {
      filterContent(e);
    }

    // Clear search
    if (e.target.matches('[data-clear-search]')) {
      clearSearch();
    }

    // Clear filters
    if (e.target.matches('[data-clear-filters]')) {
      clearSearch();
      resetFilters();
    }

    // Content toggle
    if (e.target.matches('[data-toggle]')) {
      toggleContent(e.target);
    }

    // Theme toggle
    if (e.target === themeToggle) {
      updateColorTheme(themeToggle.getAttribute('data-theme-toggle'));
    }

    // Filter toggle
    if (e.target.matches('[data-toggle="filter"]')) {
      toggleScrim();
    }

    // Scrim
    if (e.target.matches('[data-scrim]')) {
      
      // Close Scrim
      closeScrim();

      // Close filter toggle
      filterToggle.setAttribute('aria-expanded', false);

    }

  }


  // Handle keyup events
  const keyupEventHandler = (e) => {
    
    // Search input
    if (e.target.matches('[data-search]')) {

      // Get value
      let val = e.target.value;

      // Search val
      biases.search(val);

      // Show clear button
      showSearchClearButton(e.target);

      // Match input on other search inputs
      search.forEach(element => {
        if (element !== e.target) element.value = val;
      });
    }

    // Tab key
    if (e.keyCode === 9) {
      document.documentElement.classList.replace("no-focus-outline", "focus-outline");
    }

  }


  // Get value of CSS var
  const getCSSCustomProp = (propKey) => {
    let response = getComputedStyle(document.documentElement).getPropertyValue(propKey);
    if (response.length) {
      response = response.replace(/\'/g, '').trim();
    }
    return response;
  };


  // Filter content and manage active state on toggle
  const filterContent = (e) => {

    // Get target element
    let target = e.target;

    // Get filter value
    let filterName = target.getAttribute('data-filter');

    // Toggle filter if already active
    if (target.getAttribute('data-filter') === filterName && target.classList.contains(activeClass)) {
      resetFilters();
      return;
    }

    // Update active filter
    setActiveFilter(filterName);

    // Apply filter
    biases.filter(function(item) {
      return (item.values().category == filterName) || (item.values().tag.includes(filterName));
    });
  }


  // Set active filter item
  const setActiveFilter = (filterName) => {
    
    // Loop through filters
    filterItem.forEach(element => {
      
      // If filter matches element
      if (element.getAttribute('data-filter') === filterName) {
        
        // Add active class
        element.classList.add(activeClass);
      
      } else {

        // Remove active class
        element.classList.remove(activeClass);
        
      }

    });

  }


  // Show/Hide clear search button
  const showSearchClearButton = (target) => {
    let charLength = target.value.length;

    // If search value is provided
    // Toggle clear button on each search input (via parent elem)
    if (charLength > 0) {
      search.forEach(element => {
        element.parentElement.classList.add(activeClass)
      });
    } else {
      search.forEach(element => {
        element.parentElement.classList.remove(activeClass)
      });
    }
  }


  // Clear search
  const clearSearch = () => {
    
    // Loop through all search inputs
    search.forEach(element => {

      // Clear value in input
      element.value = '';

      // Remove active class on parent
      element.parentElement.classList.remove(activeClass)

    });

    // Reset search
    biases.search();
  }


  // Reset filters
  const resetFilters = () => {
    biases.filter();
    filterItem.forEach(element => {
      element.classList.remove(activeClass);
    });
  }


  // Toggle content
  const toggleContent = (toggle) => {

    // Get current toggle state
    let expanded = toggle.getAttribute('aria-expanded') === 'true';

    // Update menu toggle
    toggle.setAttribute('aria-expanded', String(!expanded));

  }


  // Close scrim
  const closeScrim = () => {

    // Show/hide scrim
    scrim.classList.remove(activeClass);

    // Disable scrolling
    document.documentElement.classList.remove(inactiveClass);
    
  }

  
  // Toggle Scrim
  const toggleScrim = () => {

    // Show/hide scrim
    scrim.classList.toggle(activeClass);

    // Disable scrolling
    document.documentElement.classList.toggle(inactiveClass);
  }


  // Observe primary filter visibility
  let observePrimaryFilter = new IntersectionObserver(elem => {
    if (elem[0].boundingClientRect.y < 0) {

      // Show secondary filter
      secondaryFilter.classList.add(activeClass);

    } else {

      // Hide secondary filter
      secondaryFilter.classList.remove(activeClass);
      
      // Collase secondary filter toggle
      filterToggle.setAttribute('aria-expanded', false);

      // Close scrim
      closeScrim();

    }
  }, observerSettings);


  // Check for theme preference via CSS Media Query
  const checkColorTheme = () => {

    // Create init mode variable
    let mode;

    // Update mode variable from localStorage or CSSCustomProp
    if (localStorage.getItem('color-mode')) {
      mode = localStorage.getItem('color-mode');
    } else {
      mode = getCSSCustomProp('--color-mode');
    }
    
    // Update CSS based on :root data-attribute
    document.documentElement.setAttribute('data-color-mode', mode);

    // Update theme toggle
    themeToggle.setAttribute('data-theme-toggle', mode);
    themeToggle.setAttribute('aria-pressed', themeToggle.getAttribute('data-theme-toggle') === 'dark' ? 'true' : 'false');
  };


  // Update Color Theme
  const updateColorTheme = (mode) => {

    // Update CSS based on :root data-attribute
    document.documentElement.setAttribute('data-color-mode', themeToggle.getAttribute('data-theme-toggle') === 'dark' ? 'light' : 'dark');

    // Update theme toggle
    themeToggle.setAttribute('data-theme-toggle', themeToggle.getAttribute('data-theme-toggle') === 'dark' ? 'light' : 'dark');
    themeToggle.setAttribute('aria-pressed', themeToggle.getAttribute('data-theme-toggle') === 'dark' ? 'true' : 'false');

    // Update localStorage
    localStorage.setItem('color-mode', mode === 'dark' ? 'light' : 'dark');
  };



  /**
   * Events/APIs/init
   */

  // Remove 'no-js' class on :root element
  document.documentElement.classList.remove('no-js');


  // Provide CSS state to displable focus outline by default
  document.documentElement.classList.add("no-focus-outline");


  // Listen for click events
  document.addEventListener('click', clickEventHandler, false);


  // Listen for keyup events
  document.addEventListener('keyup', keyupEventHandler, false);


  // Init filterable list
  let biases = new List('biases', listSettings);


  // Init Observer on primaryFilter
  observePrimaryFilter.observe(primaryFilter);


  // Check user color scheme preference
  checkColorTheme();


  // Initialize the service worker
  if (navigator && navigator.serviceWorker) {
    navigator.serviceWorker.register('/service-worker.js');
  }
  
})();
