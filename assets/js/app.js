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
  // let filterToggle = document.querySelector('[data-toggle="filter"]');
  let listHeader = document.querySelector('[data-list-header]');
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
      { name: 'context', data: ['context'] },
      { name: 'tags', data: ['tags'] },
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
    if (e.target.matches('[data-toggle-filter]')) {
      filterContainer.classList.toggle(activeClass);
      toggleScrim();
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
    if (e.target.matches('[data-search]')) {

      // Get value
      let val = e.target.value;

      // Search val
      biases.search(val);

      // Show clear button
      showSearchClearButton(e.target);
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

    // Update filter control
    setActiveFilter(target);

    // Context filters
    let contextFilters = [];
    let contextItems = document.querySelectorAll('[data-filter="context"][aria-pressed="true"]');
    contextItems.forEach(element => {
      contextFilters.push(element.textContent);
    });
    
    // Tag filters
    let tagFilters = [];
    let tagItems = document.querySelectorAll('[data-filter="tag"][aria-pressed="true"]');
    tagItems.forEach(element => {
      tagFilters.push(element.textContent);
    });


    // Apply filters
		biases.filter(function (item) {
      return item.values().context.includes(contextFilters) && 
      tagFilters.every(name => {
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
    filterItem.forEach(element => {
      element.classList.remove(activeClass);
      element.setAttribute('aria-pressed', 'false');
    });
    biases.filter();
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
    scrim.classList.remove(activeClass);
  }

  
  // Toggle Scrim
  const toggleScrim = () => {
    scrim.classList.toggle(activeClass);
  }


  // Observe primary filter visibility
  // let observeListHeader = new IntersectionObserver(elem => {
  //   if (elem[0].boundingClientRect.y < 0) {

  //     // Show secondary filter
  //     listHeader.classList.add(activeClass);

  //   } else {

  //     // Show secondary filter
  //     listHeader.classList.remove(activeClass);

  //   }
  // }, observerSettings);


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


  // Init Observer on list header
  // if (listHeader) observeListHeader.observe(listHeader);


  // Check user color scheme preference
  checkColorTheme();
  
})();
