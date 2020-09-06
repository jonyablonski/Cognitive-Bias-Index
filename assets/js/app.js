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
  let search = document.querySelectorAll('[data-search]');


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
      clearFilters();
    }

    // Content toggle
    if (e.target.matches('[data-toggle]')) {
      toggleContent(e.target);
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

  }


  // Filter content and manage active state on toggle
  const filterContent = (e) => {

    // Get target element
    let target = e.target;

    // Get filter value
    let filterName = target.getAttribute('data-filter');

    // Toggle filter if already active
    if (target.getAttribute('data-filter') === filterName && target.classList.contains(activeClass)) {
      target.classList.remove(activeClass);
      biases.filter();
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


  // Clear filters
  const clearFilters = () => {

    // Clear filters
    biases.filter();

    // Look through all filter items
    filterItem.forEach(element => {

      // Remove active class each item
      element.classList.remove(activeClass);

    });

    // Clear search
    clearSearch();
  }


  // Toggle content
  const toggleContent = (toggle) => {

    // Get current toggle state
    let expanded = toggle.getAttribute('aria-expanded') === 'true';

    // Update menu toggle
    toggle.setAttribute('aria-expanded', String(!expanded));

  }


  // Observe filter
  let observeFilter = new IntersectionObserver(elem => {
    if (elem[0].boundingClientRect.y < 0) {
      secondaryFilter.classList.add(activeClass);
    } else {
      secondaryFilter.classList.remove(activeClass);
    }
  }, observerSettings);


  /**
   * Events/APIs/init
   */

  // Remove 'no-js' class on :root element
  document.documentElement.classList.remove('no-js');

  // Listen for click events
  document.addEventListener('click', clickEventHandler, false);

  // Listen for keyup events
  document.addEventListener('keyup', keyupEventHandler, false);

  // Init filterable list
  let biases = new List('biases', listSettings);

  // Init Observer on primaryFilter
  observeFilter.observe(primaryFilter);

})();
