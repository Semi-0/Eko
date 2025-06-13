/**
 * MiniVue - A Minimal SwiftUI-like Framework in TypeScript
 * 
 * Architecture Overview:
 * 1. Reactivity System - Core reactive state management
 * 2. Virtual DOM - VNode representation and diffing
 * 3. Component Library - UI building blocks
 * 4. Routing System - Client-side navigation
 * 5. Renderer - DOM manipulation and updates
 * 6. Application Bootstrap - App initialization
 */

// =============================================================================
// 1. REACTIVITY SYSTEM
// =============================================================================

/**
 * Effect function type - functions that react to state changes
 */
export type EffectFn = () => void;

/**
 * Global state for tracking reactive dependencies
 */
let activeEffect: EffectFn | null = null;
const targetMap = new WeakMap<object, Map<string | symbol, Set<EffectFn>>>();

/**
 * Track dependencies between reactive objects and effects
 * Called when a reactive property is accessed
 */
function track(target: object, key: string | symbol): void {
  if (!activeEffect) return;
  
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }
  
  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }
  
  dep.add(activeEffect);
}

/**
 * Trigger effects when a reactive property changes
 * Called when a reactive property is modified
 */
function trigger(target: object, key: string | symbol): void {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  
  const dep = depsMap.get(key);
  if (!dep) return;
  
  dep.forEach(fn => fn());
}

/**
 * Create a reactive proxy object that tracks access and mutations
 * @param obj - The object to make reactive
 * @returns Reactive proxy of the object
 */
export function reactive<T extends object>(obj: T): T {
  return new Proxy(obj, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver);
      track(target, key);
      // Recursively make nested objects reactive
      return (typeof res === 'object' && res !== null) ? reactive(res) : res;
    },
    
    set(target, key, value, receiver) {
      const oldVal = (target as any)[key];
      const result = Reflect.set(target, key, value, receiver);
      
      // Only trigger if value actually changed
      if (oldVal !== value) {
        trigger(target, key);
      }
      
      return result;
    }
  });
}

/**
 * Register an effect function that will re-run when dependencies change
 * @param fn - The effect function to register
 */
export function effect(fn: EffectFn): void {
  activeEffect = fn;
  fn(); // Run immediately to establish dependencies
  activeEffect = null;
}

// =============================================================================
// 2. VIRTUAL DOM SYSTEM
// =============================================================================

/**
 * Virtual Node representation
 */
export type VNode = {
  tag: string;
  props?: Record<string, any>;
  children: Array<VNode | string>;
  key?: string; // Add key for better diffing
};

/**
 * Update a DOM element by comparing old and new virtual nodes
 * This is the core of our virtual DOM diffing algorithm
 */
function updateElement(
  parent: HTMLElement, 
  newNode: VNode | string, 
  oldNode?: VNode | string, 
  index: number = 0
): void {
  const currentChild = parent.childNodes[index];

  // Case 1: No old node - create new element
  if (!oldNode) {
    parent.appendChild(createElement(newNode));
    return;
  }

  // Case 2: No new node - remove old element
  if (!newNode) {
    if (currentChild) {
      parent.removeChild(currentChild);
    }
    return;
  }

  // Case 3: Both are text nodes - update if different
  if (typeof newNode === 'string' && typeof oldNode === 'string') {
    if (newNode !== oldNode && currentChild) {
      currentChild.textContent = newNode;
    }
    return;
  }

  // Case 4: Different node types - replace entirely
  if (typeof newNode !== typeof oldNode || 
      (typeof newNode === 'object' && typeof oldNode === 'object' && newNode.tag !== oldNode.tag)) {
    const newElement = createElement(newNode);
    if (currentChild) {
      parent.replaceChild(newElement, currentChild);
    } else {
      parent.appendChild(newElement);
    }
    return;
  }

  // Case 5: Same VNode type - update in place
  if (typeof newNode === 'object' && typeof oldNode === 'object' && currentChild) {
    const element = currentChild as HTMLElement;
    updateProps(element, newNode.props || {}, oldNode.props || {});
    updateChildren(element, newNode.children, oldNode.children);
  }
}

/**
 * Update element properties, handling special cases like events and input values
 */
function updateProps(
  element: HTMLElement, 
  newProps: Record<string, any>, 
  oldProps: Record<string, any>
): void {
  // Remove old props that are not in new props
  Object.keys(oldProps).forEach(key => {
    if (!(key in newProps)) {
      if (key.startsWith('on')) {
        // Remove event listeners using stored reference
        const eventName = key.slice(2).toLowerCase();
        const oldHandler = (element as any)[`_${key}`];
        if (oldHandler) {
          element.removeEventListener(eventName, oldHandler);
          delete (element as any)[`_${key}`];
        }
      } else if (key !== 'key') { // Don't remove key as it's not a real attribute
        element.removeAttribute(key);
      }
    }
  });

  // Add or update new props
  Object.keys(newProps).forEach(key => {
    if (key === 'key') return; // Skip key prop
    
    if (key.startsWith('on') && typeof newProps[key] === 'function') {
      // Handle event listeners
      const eventName = key.slice(2).toLowerCase();
      const oldHandler = (element as any)[`_${key}`];
      
      // Only update if handler actually changed
      if (oldHandler !== newProps[key]) {
        if (oldHandler) {
          element.removeEventListener(eventName, oldHandler);
        }
        
        element.addEventListener(eventName, newProps[key]);
        (element as any)[`_${key}`] = newProps[key]; // Store reference for cleanup
      }
      
    } else if (oldProps[key] !== newProps[key]) {
      // Handle regular attributes with special case for input values
      if (key === 'value' && element.tagName.toLowerCase() === 'input') {
        const input = element as HTMLInputElement;
        if (input.value !== newProps[key]) {
          // Preserve cursor position when updating input value
          const selectionStart = input.selectionStart;
          const selectionEnd = input.selectionEnd;
          input.value = newProps[key];
          
          if (selectionStart !== null && selectionEnd !== null) {
            input.setSelectionRange(selectionStart, selectionEnd);
          }
        }
      } else {
        element.setAttribute(key, String(newProps[key]));
      }
    }
  });
}

/**
 * Update child elements recursively
 */
function updateChildren(
  parent: HTMLElement, 
  newChildren: (VNode | string)[], 
  oldChildren: (VNode | string)[]
): void {
  const maxLength = Math.max(newChildren.length, oldChildren.length);
  
  for (let i = 0; i < maxLength; i++) {
    updateElement(parent, newChildren[i], oldChildren[i], i);
  }
}

/**
 * Create a DOM element from a virtual node
 */
function createElement(vnode: VNode | string): Node {
  if (typeof vnode === 'string') {
    return document.createTextNode(vnode);
  }
  
  const element = document.createElement(vnode.tag);
  
  // Set properties
  if (vnode.props) {
    Object.entries(vnode.props).forEach(([key, value]) => {
      if (key === 'key') return; // Skip key prop
      
      if (key.startsWith('on') && typeof value === 'function') {
        const eventName = key.slice(2).toLowerCase();
        element.addEventListener(eventName, value);
        (element as any)[`_${key}`] = value; // Store reference
      } else if (key === 'value' && element.tagName.toLowerCase() === 'input') {
        // Handle input values specially
        (element as HTMLInputElement).value = String(value);
      } else {
        element.setAttribute(key, String(value));
      }
    });
  }
  
  // Add children
  vnode.children.forEach(child => {
    element.appendChild(createElement(child));
  });
  
  return element;
}

/**
 * Clean up all event listeners from an element and its children
 */
function cleanupElement(element: Node): void {
  if (element && (element as any).nodeType === 1) { // ELEMENT_NODE = 1
    const htmlElement = element as HTMLElement;
    
    // Remove stored event listeners
    Object.keys(htmlElement).forEach(key => {
      if (key.startsWith('_on')) {
        const eventName = key.slice(3).toLowerCase();
        const handler = (htmlElement as any)[key];
        if (handler) {
          htmlElement.removeEventListener(eventName, handler);
          delete (htmlElement as any)[key];
        }
      }
    });
    
    // Recursively clean up children
    Array.from(htmlElement.childNodes).forEach(child => {
      cleanupElement(child);
    });
  }
}

// =============================================================================
// 3. COMPONENT LIBRARY
// =============================================================================

/**
 * Text component - renders plain text
 */
export function Text(content: string): string {
  return content;
}

/**
 * Button component - interactive button with click handler
 */
export function Button(label: string, onClick: () => void): VNode {
  return {
    tag: 'button',
    props: {
      onclick: onClick,
      style: 'padding:8px 16px;border:none;border-radius:4px;background:#007AFF;color:white;cursor:pointer;font-size:14px;'
    },
    children: [label]
  };
}

/**
 * VStack - vertical stack layout
 */
export function VStack(...children: Array<VNode | string>): VNode {
  return {
    tag: 'div',
    props: { 
      style: 'display:flex;flex-direction:column;gap:12px;' 
    },
    children
  };
}

/**
 * HStack - horizontal stack layout
 */
export function HStack(...children: Array<VNode | string>): VNode {
  return {
    tag: 'div',
    props: { 
      style: 'display:flex;flex-direction:row;gap:12px;align-items:center;' 
    },
    children
  };
}

/**
 * ZStack - layered stack layout (absolute positioning)
 */
export function ZStack(...children: (VNode | string)[]): VNode {
  return { 
    tag: 'div', 
    props: { 
      style: 'position:relative;' 
    }, 
    children 
  };
}

/**
 * TextField - text input with two-way binding
 */
export function TextField(
  value: string,
  onInput: (newValue: string) => void,
  placeholder: string = ''
): VNode {
  return {
    tag: 'input',
    props: {
      type: 'text',
      value,
      placeholder,
      oninput: (e: Event) => {
        const target = e.target as HTMLInputElement;
        onInput(target.value);
      },
      style: 'padding:8px 12px;border:1px solid #ddd;border-radius:4px;font-size:14px;'
    },
    children: []
  };
}

/**
 * Link - navigation link component
 */
export function Link(text: string, to: string): VNode {
  return {
    tag: 'a',
    props: {
      href: to,
      onclick: (e: Event) => {
        e.preventDefault();
        navigateTo(to);
      },
      style: 'color:#007AFF;text-decoration:none;cursor:pointer;padding:4px 8px;border-radius:4px;transition:background-color 0.2s;'
    },
    children: [text]
  };
}

// =============================================================================
// 4. ROUTING SYSTEM
// =============================================================================

/**
 * Route definition
 */
export type Route = {
  path: string;
  component: (ctx: any) => VNode;
};

/**
 * Router instance type
 */
export type Router = {
  getCurrentRoute: () => Route | undefined;
  navigate: (path: string) => void;
  getState: () => { currentPath: string };
  destroy: () => void; // Add cleanup method
};

/**
 * Global router instance for Link components
 */
let globalRouter: Router | null = null;

/**
 * Navigate to a specific path
 */
function navigateTo(path: string): void {
  if (globalRouter) {
    globalRouter.navigate(path);
  }
}

/**
 * Create a router instance
 */
export function createRouter(routes: Route[]): Router {
  const getCurrentPath = () => window.location.pathname;
  
  const findRoute = (path: string): Route | undefined => {
    return routes.find(route => route.path === path) || 
           routes.find(route => route.path === '*');
  };
  
  // Reactive routing state
  const routingState = reactive({ 
    currentPath: getCurrentPath() 
  });
  
  // Navigation throttling
  let isNavigating = false;
  
  // Handle browser back/forward
  const handlePopState = () => {
    const newPath = getCurrentPath();
    if (routingState.currentPath !== newPath) {
      routingState.currentPath = newPath;
    }
  };
  
  // Add event listener
  window.addEventListener('popstate', handlePopState);
  
  const router: Router = {
    getCurrentRoute: () => findRoute(routingState.currentPath),
    
    navigate: (path: string) => {
      if (isNavigating || routingState.currentPath === path) {
        return; // Prevent duplicate navigation
      }
      
      isNavigating = true;
      window.history.pushState({}, '', path);
      routingState.currentPath = path;
      
      // Reset navigation flag after a short delay
      setTimeout(() => {
        isNavigating = false;
      }, 10);
    },
    
    getState: () => routingState,
    
    destroy: () => {
      window.removeEventListener('popstate', handlePopState);
    }
  };
  
  return router;
}

// =============================================================================
// 5. APPLICATION BOOTSTRAP
// =============================================================================

/**
 * Application configuration
 */
export type AppConfig = {
  data: () => Record<string, any>;
  render?: (ctx: any) => VNode;
  router?: Router;
};

/**
 * Application instance
 */
export type App = {
  mount: (selector: string) => void;
  unmount: () => void; // Add cleanup method
};

/**
 * Create an application instance
 */
export function createApp(config: AppConfig): App {
  let mounted = false;
  let root: HTMLElement | null = null;
  let oldTree: VNode | null = null;
  let cleanupEffect: (() => void) | null = null;
  
  return {
    mount(selector: string) {
      if (mounted) {
        throw new Error('App is already mounted');
      }
      
      const container = document.querySelector(selector);
      if (!container) {
        throw new Error(`Container not found: ${selector}`);
      }
      
      root = container as HTMLElement;
      mounted = true;
      
      // Initialize reactive state
      const state = reactive(config.data());
      
      // Set global router if provided
      if (config.router) {
        globalRouter = config.router;
      }
      
      // Main render function
      const render = () => {
        if (!mounted || !root) return; // Guard against unmounted state
        
        let newTree: VNode;
        let currentRoute: string | undefined;
        
        if (config.router) {
          // Router-based rendering
          const route = config.router.getCurrentRoute();
          currentRoute = route?.path;
          
          if (route) {
            newTree = route.component(state);
          } else {
            newTree = {
              tag: 'div',
              props: { style: 'padding:20px;text-align:center;color:#666;' },
              children: ['404 - Page Not Found']
            };
          }
        } else if (config.render) {
          // Direct render function
          newTree = config.render(state);
        } else {
          throw new Error('Either render function or router must be provided');
        }
        
        // For routing, check if we're switching routes
        const isRouteChange = config.router && oldTree && 
          (oldTree as any)._route !== currentRoute;
        
        // Apply virtual DOM diffing
        if (!oldTree || isRouteChange) {
          // Clear container and add new content for first render or route changes
          // Clean up existing event listeners first
          Array.from(root.childNodes).forEach(child => {
            cleanupElement(child);
          });
          
          root.innerHTML = '';
          root.appendChild(createElement(newTree));
        } else {
          // Update existing tree for same route
          updateElement(root, newTree, oldTree, 0);
        }
        
        // Store route info for next render
        if (config.router && currentRoute) {
          (newTree as any)._route = currentRoute;
        }
        
        oldTree = newTree;
      };
      
      // Set up reactive rendering with cleanup tracking
      if (config.router) {
        // Track both app state and routing state
        let effectActive = true;
        
        const effectFn = () => {
          if (!effectActive) return;
          // Access routing state to establish dependency
          config.router!.getState().currentPath;
          render();
        };
        
        effect(effectFn);
        
        cleanupEffect = () => {
          effectActive = false;
        };
      } else {
        // Track only app state
        let effectActive = true;
        
        const effectFn = () => {
          if (!effectActive) return;
          render();
        };
        
        effect(effectFn);
        
        cleanupEffect = () => {
          effectActive = false;
        };
      }
    },
    
    unmount() {
      if (!mounted) return;
      
      mounted = false;
      
      // Cleanup effect
      if (cleanupEffect) {
        cleanupEffect();
        cleanupEffect = null;
      }
      
      // Cleanup router
      if (config.router) {
        config.router.destroy();
        globalRouter = null;
      }
      
      // Clear DOM
      if (root) {
        root.innerHTML = '';
        root = null;
      }
      
      oldTree = null;
    }
  };
}
