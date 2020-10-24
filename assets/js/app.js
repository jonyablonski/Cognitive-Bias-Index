/**
 * Imports
 */

import List from "list.js";


(function() {

  'use strict';


  /**
   * Selectors
   */
  
  let filterContainer = document.querySelector('[data-filter-container]');
  let filterItem = document.querySelectorAll('[data-filter]');
  let filterClear = document.querySelector('[data-clear-filters]');
  let search = document.querySelector('[data-search]');
  let themeToggle = document.querySelector('[data-theme-toggle]');
  let scrim = document.querySelector('[data-scrim]');
  let graphic = document.querySelector('[data-graphic] feTurbulence');


  /**
   * States
   */
  
  const activeClass = 'is-active';


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
    valueNames: [
      'title',
      'desc',
      { name: 'context', data: ['context'] },
      { name: 'tags', data: ['tags'] },
    ],
    pagination: true,
    page: 50
  };

  // SVG turbulence
  let frames = 0;
  let rad = Math.PI / 60;


  /**
   * Methods
   */

   
  // Handle click events
  const clickEventHandler = (e) => {

    // Filter button
    if (e.target.matches('[data-filter]')) {

      // Get all matching filter buttons
      let toggles = document.querySelectorAll('[data-filter-val="' + e.target.getAttribute('data-filter-val') + '"]');
      
      // Update each filter button
      toggles.forEach(element => {
        filterContent(element);
      });

      showFilterClearButton();
      updateClearButtonCount();
    }

    // Clear search
    if (e.target.matches('[data-clear-search]')) {
      clearSearch();
    }

    // Clear filters
    if (e.target.matches('[data-clear-filters]')) {
      clearSearch();
      resetFilters();
      showFilterClearButton();
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
    if (e.target.matches('[data-toggle-filter]')) {
      
      // Get filter section value
      let activeSection = e.target.getAttribute('data-toggle-filter');
      
      // Show/hide filter
      filterContainer.classList.toggle(activeClass);

      // Set active filter section on filter container
      filterContainer.setAttribute('data-filter-section', activeSection);
      
      // Show/hide scrim
      toggleScrim();

      // Focus search input
      if (activeSection === "search") {
        search.focus();
      }
    }

    // Filter close
    if (e.target.matches('[data-close-filter]')) {
      filterContainer.classList.remove(activeClass);
      closeScrim();
    }

    // Scrim
    if (e.target.matches('[data-scrim]')) {
      
      // Close Scrim
      closeScrim();

      // Close filter
      filterContainer.classList.remove(activeClass);

    }

  }


  // Handle keyup events
  const keyupEventHandler = (e) => {
    
    // Search input
    if (e.target === search) {

      // Get value
      let val = e.target.value;

      // Search val
      biases.search(val);

      // Show clear button
      showSearchClearButton(e.target);

      // Update active filter count
      updateClearButtonCount();

      // Show/hide filter clear button
      showFilterClearButton();

      // Close filter on enter
      if (e.keyCode === 13) {
        
        // Close Scrim
        closeScrim();

        // Close filter
        filterContainer.classList.remove(activeClass);
      }
    }

    // Tab key
    if (e.keyCode === 9) {
      document.documentElement.classList.replace("no-focus-outline", "focus-outline");
    }

    // Esc key
    if (e.keyCode === 27 && filterContainer.classList.contains(activeClass)) {
      filterContainer.classList.toggle(activeClass);
      toggleScrim();
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


  // Toggle content
  const toggleContent = (toggle) => {

    // Get current toggle state
    let expanded = toggle.getAttribute('aria-expanded') === 'true';

    // Update menu toggle
    toggle.setAttribute('aria-expanded', String(!expanded));

  }


  // Get active context filter array
  const getContextFilters = () => {
    let contextFilters = [];
    let contextItems = document.querySelectorAll('[data-filter="context"][aria-pressed="true"]');
    contextItems.forEach(element => {
      contextFilters.push(element.textContent);
    }); 

    // Return without duplicates
    return [...new Set(contextFilters)];
  }


  // Get active tags filter array
  const getTagFilters = () => {
    let tagFilters = [];
    let tagItems = document.querySelectorAll('[data-filter="tag"][aria-pressed="true"]');
    tagItems.forEach(element => {
      tagFilters.push(element.textContent);
    });

    // Return without duplicates
    return [...new Set(tagFilters)];
  }


  // Filter content and manage active state on toggle
  const filterContent = (elem) => {

    // Get target element
    let target = elem;

    // Update filter control
    setActiveFilter(target);

    // Apply filters
		biases.filter(function (item) {
      return item.values().context.includes(getContextFilters()) && getTagFilters().every(name => {
        return item.values().tags.includes(name);
      });
    });
  }


  // Set active filter item
  const setActiveFilter = (element) => {

    // Get current toggle state
    let pressed = element.getAttribute('aria-pressed') === 'true';

    // Update menu toggle aria state
    element.setAttribute('aria-pressed', String(!pressed));

    // Update menu toggle class
    element.classList.toggle(activeClass);

  }


  // Show/Hide clear filter button
  const showFilterClearButton = () => {
    if (biases.matchingItems.length !== biases.items.length) {
      filterClear.classList.add(activeClass);
    } else {
      filterClear.classList.remove(activeClass);
    }
  }


  // Clear search
  const clearSearch = () => {
    
    // Clear value in input
    search.value = '';

    // Remove active class on parent
    search.parentElement.classList.remove(activeClass);

    // Reset search
    biases.search();

    // Update active filter count
    updateClearButtonCount();

    // Show/hide filter clear button
    showFilterClearButton();
  }


  // Reset filters
  const resetFilters = () => {
    filterItem.forEach(element => {
      element.classList.remove(activeClass);
      element.setAttribute('aria-pressed', 'false');
    });
    biases.filter();
  }


  // Show/Hide clear search button
  const showSearchClearButton = (target) => {
    
    // Get search value character length
    let charLength = target.value.length;

    // If search value is provided
    // Toggle clear button on each search input (via parent elem)
    if (charLength > 0) {
      search.parentElement.classList.add(activeClass);
    } else {
      search.parentElement.classList.remove(activeClass);
    }
  }


  // Update active filter count on clear button
  const updateClearButtonCount = () => {
    
    // Get active filter count
    let filterCount = getContextFilters().length + getTagFilters().length;

    // Update value from active fitlers + search
    if (biases.searched) {
      filterClear.setAttribute('data-clear-filters', filterCount + 1);
    } else {
      filterClear.setAttribute('data-clear-filters', filterCount);
    }
  }


  // Close scrim
  const closeScrim = () => {
    scrim.classList.remove(activeClass);
  }

  
  // Toggle Scrim
  const toggleScrim = () => {
    scrim.classList.toggle(activeClass);
  }


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


  // Animate SVG turbulence
  const animateBaseFrequency = () => {
    let bfx = 0.005;
    let bfy = 0.005;
    frames += .15
    bfx += 0.006 * Math.cos(frames * rad);
    bfy += 0.006 * Math.sin(frames * rad);
    let bf = bfx.toString() + ' ' + bfy.toString();
    graphic.setAttributeNS(null, 'baseFrequency', bf);
    window.requestAnimationFrame(animateBaseFrequency);
  }



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


  // Check user color scheme preference
  checkColorTheme();


  // Initiate SVG turbulence animation
  if (graphic) window.requestAnimationFrame(animateBaseFrequency);
  
})();
