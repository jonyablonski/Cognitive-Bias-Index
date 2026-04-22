/**
 * Imports
 */

import List from "list.js";


(function() {

  
  'use strict';


  /**
   * Selectors
   */
  
  let biasesList = document.querySelector('#biases') || document.querySelector('#tools');
  let filterContainer = document.querySelector('[data-filter-container]');
  let filterItem = document.querySelectorAll('[data-filter]');
  let filterClear = document.querySelector('[data-clear-filters]');
  let filterToggle = document.querySelector('[data-active-filters]');
  let search = document.querySelector('[data-search]');
  let themeToggle = document.querySelector('[data-theme-toggle]');
  let scrim = document.querySelector('[data-scrim]');

  let results = document.querySelector('#biases-results');
  let pagination = document.querySelector('#pagination');


  /**
   * States
   */
  
  const activeClass = 'is-active';


  /**
   * Utils
   */

  const track = (event, props) => {
    if (window.mixpanel) window.mixpanel.track(event, props);
  };

  const debounce = (fn, delay) => {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
  };

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
      updateClearButtonCount();
    }

    // Content toggle
    if (e.target.matches('[data-toggle]')) {
      toggleContent(e.target);
    }

    // Copy link
    const copyBtn = e.target.closest('[data-copy-url]');
    if (copyBtn) {
      copyLink(copyBtn);
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


  // Delegate pagination click events
  const paginationEventHandler = () => {

    // Scroll to top of biases list
    biasesList.scrollIntoView({
      behavior: "smooth", 
      block: "start"
    });
  }


  const trackSearch = debounce((query) => {
    if (query.length > 0) track('Bias Searched', { query });
  }, 500);


  // Handle keyup events
  const keyupEventHandler = (e) => {

    // Search input
    if (e.target === search) {

      // Get value
      let val = e.target.value;

      // Search val
      if (biases) biases.search(val);
      trackSearch(val);

      // Show clear button
      showSearchClearButton(e.target);

      // Update active filter count
      updateClearButtonCount();

      // Show/hide filter clear button
      showFilterClearButton();

      // Update filter matching results header
      if (val.length === 0) {
        clearFilterResults();
      } else {
        updateFilterResults();
      }

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


  // Toast element
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = 'Link copied to clipboard';
  document.body.appendChild(toast);

  let toastTimer;
  const showToast = () => {
    clearTimeout(toastTimer);
    toast.classList.add('is-visible');
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2500);
  };


  // Copy bias URL to clipboard
  const copyLink = (btn) => {
    const url = btn.getAttribute('data-copy-url');
    navigator.clipboard.writeText(url).then(() => {
      btn.classList.add('is-copied');
      setTimeout(() => btn.classList.remove('is-copied'), 2500);
      showToast();
      track('Bias Link Copied', { url });
    });
  }


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
    const contextFilters = getContextFilters();
    const tagFilters = getTagFilters();
    const filterType = target.getAttribute('data-filter');
    const filterVal = target.getAttribute('data-filter-val');
    const isActive = target.getAttribute('aria-pressed') === 'true';
    track('Bias Filtered', { filter_type: filterType, filter_value: filterVal, active: isActive });
    if (biases) biases.filter(function (item) {
      if (contextFilters.length === 0 && tagFilters.length === 0) return true;
      let matchesContext = contextFilters.some(name => item.values().context.includes(name));
      let matchesTag = tagFilters.some(name => item.values().tags.includes(name));
      return matchesContext || matchesTag;
    });

    // Update filter matching results header
    updateFilterResults();

    // Show/hide clear button and update count
    showFilterClearButton();
    updateClearButtonCount();
  }


  // Update filter results header
  const updateFilterResults = () => {

    // Clear prior result message
    clearFilterResults();
    
    // Create results elem
    let result = document.createElement('div');
    result.className = 'message';
    
    // Add text to results elem
    if (!biases || biases.matchingItems.length > 0) {
      result.textContent = biases ? `${biases.matchingItems.length} results found` : '';
    } else {
      result.textContent = 'No results found';
    }

    // Insert results elem
    results.appendChild(result);
  }


  // Clear filter results header
  const clearFilterResults = () => {
    results.innerHTML = '';
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
    let hasActiveFilters = getContextFilters().length > 0 || getTagFilters().length > 0 || (biases && biases.searched);
    if (hasActiveFilters) {
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
    if (biases) biases.search();

    // Clear results message
    clearFilterResults();

    // Update active filter count
    updateClearButtonCount();

    // Show/hide filter clear button
    showFilterClearButton();
  }


  // Reset filters
  const resetFilters = () => {
    
    // Remove active state on all filters
    filterItem.forEach(element => {
      element.classList.remove(activeClass);
      element.setAttribute('aria-pressed', 'false');
    });

    // Reset filtering
    if (biases) biases.filter();

    // Clear filter results
    clearFilterResults();
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


  // Update active filter count on filter toggle button
  const updateClearButtonCount = () => {

    // Get active filter count
    let filterCount = getContextFilters().length + getTagFilters().length;
    let totalCount = (biases && biases.searched) ? filterCount + 1 : filterCount;

    filterToggle.setAttribute('data-active-filters', totalCount);
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
    const newMode = mode === 'dark' ? 'light' : 'dark';

    // Update CSS based on :root data-attribute
    document.documentElement.setAttribute('data-color-mode', newMode);

    // Update theme toggle
    themeToggle.setAttribute('data-theme-toggle', newMode);
    themeToggle.setAttribute('aria-pressed', newMode === 'dark' ? 'true' : 'false');

    // Update localStorage
    localStorage.setItem('color-mode', newMode);

    track('Theme Changed', { theme: newMode });
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


  // Listen for click events on pagination elem
  if (pagination) pagination.addEventListener('click', paginationEventHandler, false);


  // Init filterable list
  let biases = biasesList ? new List(biasesList.id, listSettings) : null;


  // Scroll to and highlight bias if URL contains a matching hash fragment
  const hash = window.location.hash.slice(1);
  if (hash) {
    const target = document.getElementById(hash);
    if (target) {
      if (biases) biases.show(1, biases.size());
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('is-highlighted');
        setTimeout(() => target.classList.remove('is-highlighted'), 2500);
      }, 100);
    }
  }


  // Check user color scheme preference
  checkColorTheme();


})();
