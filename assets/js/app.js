/**
 * Imports
 */

import List from "list.js";


(function() {

  'use strict';


  /**
   * Selectors
   */
  
  let filterItem = document.querySelectorAll('[data-filter]');
  let search = document.querySelector('[data-search]');


  /**
   * States
   */
  
  const activeClass = 'is-active';
  const inactiveClass = 'is-inactive';
  const visibleClass = 'is-visible';


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
    searchClass: 'search__input',
    valueNames: [
      'title',
      'category',
      'tag'
    ],
    pagination: true
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
      clearSearch(e.target);
    }

    // Clear filters
    if (e.target.matches('[data-clear-filters]')) {
      clearFilters();
    }

  }


  // Handle keyup events
  const keyupEventHandler = (e) => {
    
    // Search input
    if (e.target === search) {
      showSearchClearButton();
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
  const showSearchClearButton = () => {
    let val = search.value;
    let container = search.parentElement;
    container.classList.toggle(activeClass, val.length > 0);
  }


  // Clear search
  const clearSearch = (element) => {
    let search  = element.previousElementSibling;
    search.value = '';
    biases.search();
    showSearchClearButton();
  }


  // Clear filters
  const clearFilters = () => {
    biases.filter();
    filterItem.forEach(element => {
      element.classList.remove(activeClass);
    });
  }


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

})();
