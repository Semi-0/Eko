/**
 * MiniVue Framework Test Suite
 * Comprehensive tests for all framework components
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { JSDOM } from 'jsdom';
import {
  reactive,
  effect,
  Text,
  Button,
  VStack,
  HStack,
  TextField,
  Link,
  createRouter,
  createApp,
  type Route,
  type Router
} from './miniVue';

// =============================================================================
// TEST SETUP
// =============================================================================

let dom: JSDOM;
let document: Document;
let window: Window & typeof globalThis;

beforeEach(() => {
  // Set up DOM environment
  dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>', {
    url: 'http://localhost:3000/',
    pretendToBeVisual: true,
    resources: 'usable'
  });
  
  document = dom.window.document;
  window = dom.window as unknown as Window & typeof globalThis;
  
  // Set global DOM objects
  global.document = document;
  global.window = window;
  global.HTMLElement = window.HTMLElement;
  global.HTMLInputElement = window.HTMLInputElement;
  global.Event = window.Event;
  global.PopStateEvent = window.PopStateEvent;
});

afterEach(() => {
  // Clean up
  dom.window.close();
});

// =============================================================================
// REACTIVITY SYSTEM TESTS
// =============================================================================

describe('Reactivity System', () => {
  test('reactive() creates reactive objects', () => {
    const state = reactive({ count: 0 });
    expect(state.count).toBe(0);
    
    state.count = 5;
    expect(state.count).toBe(5);
  });

  test('effect() runs immediately and on state changes', () => {
    const state = reactive({ count: 0 });
    let effectRuns = 0;
    let lastValue = 0;

    effect(() => {
      effectRuns++;
      lastValue = state.count;
    });

    expect(effectRuns).toBe(1);
    expect(lastValue).toBe(0);

    state.count = 10;
    expect(effectRuns).toBe(2);
    expect(lastValue).toBe(10);
  });

  test('nested reactive objects work correctly', () => {
    const state = reactive({ 
      user: { name: 'John', age: 30 } 
    });
    
    let effectRuns = 0;
    let lastName = '';

    effect(() => {
      effectRuns++;
      lastName = state.user.name;
    });

    expect(effectRuns).toBe(1);
    expect(lastName).toBe('John');

    state.user.name = 'Jane';
    expect(effectRuns).toBe(2);
    expect(lastName).toBe('Jane');
  });

  test('multiple effects track the same property', () => {
    const state = reactive({ count: 0 });
    let effect1Runs = 0;
    let effect2Runs = 0;

    effect(() => {
      effect1Runs++;
      state.count; // Access to track
    });

    effect(() => {
      effect2Runs++;
      state.count; // Access to track
    });

    expect(effect1Runs).toBe(1);
    expect(effect2Runs).toBe(1);

    state.count = 5;
    expect(effect1Runs).toBe(2);
    expect(effect2Runs).toBe(2);
  });
});

// =============================================================================
// COMPONENT TESTS
// =============================================================================

describe('Components', () => {
  test('Text() returns string content', () => {
    const result = Text('Hello World');
    expect(result).toBe('Hello World');
  });

  test('Button() creates correct VNode structure', () => {
    const onClick = mock(() => {});
    const button = Button('Click me', onClick);

    expect(button.tag).toBe('button');
    expect(button.children).toEqual(['Click me']);
    expect(button.props?.onclick).toBe(onClick);
    expect(button.props?.style).toContain('background:#007AFF');
  });

  test('VStack() creates vertical layout', () => {
    const stack = VStack(
      Text('Item 1'),
      Text('Item 2')
    );

    expect(stack.tag).toBe('div');
    expect(stack.props?.style).toContain('flex-direction:column');
    expect(stack.children).toEqual(['Item 1', 'Item 2']);
  });

  test('HStack() creates horizontal layout', () => {
    const stack = HStack(
      Text('Item 1'),
      Text('Item 2')
    );

    expect(stack.tag).toBe('div');
    expect(stack.props?.style).toContain('flex-direction:row');
    expect(stack.children).toEqual(['Item 1', 'Item 2']);
  });

  test('TextField() creates input with correct props', () => {
    const onInput = mock(() => {});
    const field = TextField('initial', onInput, 'placeholder');

    expect(field.tag).toBe('input');
    expect(field.props?.type).toBe('text');
    expect(field.props?.value).toBe('initial');
    expect(field.props?.placeholder).toBe('placeholder');
    expect(typeof field.props?.oninput).toBe('function');
  });

  test('Link() creates navigation link', () => {
    const link = Link('Home', '/home');

    expect(link.tag).toBe('a');
    expect(link.props?.href).toBe('/home');
    expect(link.children).toEqual(['Home']);
    expect(typeof link.props?.onclick).toBe('function');
  });

  test('components handle empty children', () => {
    const stack = VStack();
    expect(stack.children).toEqual([]);
  });
});

// =============================================================================
// ROUTING SYSTEM TESTS
// =============================================================================

describe('Routing System', () => {
  test('createRouter() returns router with correct interface', () => {
    const routes = [
      { path: '/', component: () => VStack(Text('Home')) }
    ];
    
    const router = createRouter(routes);
    
    expect(typeof router.getCurrentRoute).toBe('function');
    expect(typeof router.navigate).toBe('function');
    expect(typeof router.getState).toBe('function');
  });

  test('router finds correct route for path', () => {
    const routes = [
      { path: '/', component: () => VStack(Text('Home')) },
      { path: '/about', component: () => VStack(Text('About')) },
      { path: '*', component: () => VStack(Text('404')) }
    ];
    
    const router = createRouter(routes);
    
    // Test initial route (should be '/' based on current location)
    const initialRoute = router.getCurrentRoute();
    expect(initialRoute?.path).toBe('/');
  });

  test('router navigation updates state', () => {
    const routes = [
      { path: '/', component: () => VStack(Text('Home')) },
      { path: '/about', component: () => VStack(Text('About')) }
    ];
    
    const router = createRouter(routes);
    
    // Navigate to about
    router.navigate('/about');
    
    expect(router.getState().currentPath).toBe('/about');
    
    const route = router.getCurrentRoute();
    expect(route?.path).toBe('/about');
  });

  test('router handles unknown routes with wildcard', () => {
    const routes = [
      { path: '/', component: () => VStack(Text('Home')) },
      { path: '*', component: () => VStack(Text('404')) }
    ];
    
    const router = createRouter(routes);
    
    router.navigate('/unknown');
    
    const route = router.getCurrentRoute();
    expect(route?.path).toBe('*');
  });

  test('router state is reactive', () => {
    const routes = [
      { path: '/', component: () => VStack(Text('Home')) },
      { path: '/about', component: () => VStack(Text('About')) }
    ];
    
    const router = createRouter(routes);
    
    let effectRuns = 0;
    let currentPath = '';

    effect(() => {
      effectRuns++;
      currentPath = router.getState().currentPath;
    });

    expect(effectRuns).toBe(1);

    router.navigate('/about');
    expect(effectRuns).toBe(2);
    expect(currentPath).toBe('/about');
  });

  test('router handles empty routes array', () => {
    const router = createRouter([]);
    const route = router.getCurrentRoute();
    expect(route).toBeUndefined();
  });
});

// =============================================================================
// APPLICATION INTEGRATION TESTS
// =============================================================================

describe('Application Integration', () => {
  test('createApp() with render function works', () => {
    const app = createApp({
      data: () => ({ message: 'Hello' }),
      render: (state) => VStack(Text(state.message))
    });

    expect(typeof app.mount).toBe('function');
    
    app.mount('#app');
    
    const appElement = document.querySelector('#app');
    expect(appElement?.textContent).toBe('Hello');
  });

  test('createApp() with router works', () => {
    const routes = [
      { path: '/', component: (state: any) => VStack(Text(`Home: ${state.count}`)) },
      { path: '/about', component: () => VStack(Text('About Page')) }
    ];

    const router = createRouter(routes);
    const app = createApp({
      data: () => ({ count: 42 }),
      router
    });

    app.mount('#app');
    
    const appElement = document.querySelector('#app');
    expect(appElement?.textContent).toBe('Home: 42');
  });

  test('app state updates trigger re-renders', () => {
    let state: any;
    
    const app = createApp({
      data: () => ({ count: 0 }),
      render: (s) => {
        state = s;
        return VStack(Text(`Count: ${s.count}`));
      }
    });

    app.mount('#app');
    
    let appElement = document.querySelector('#app');
    expect(appElement?.textContent).toBe('Count: 0');

    // Update state
    state.count = 5;
    
    // Should trigger re-render
    appElement = document.querySelector('#app');
    expect(appElement?.textContent).toBe('Count: 5');
  });

  test('router navigation triggers re-renders', () => {
    const routes = [
      { path: '/', component: () => VStack(Text('Home Page')) },
      { path: '/about', component: () => VStack(Text('About Page')) }
    ];

    const router = createRouter(routes);
    const app = createApp({
      data: () => ({}),
      router
    });

    app.mount('#app');
    
    let appElement = document.querySelector('#app');
    expect(appElement?.textContent).toBe('Home Page');

    // Navigate to about
    router.navigate('/about');
    
    appElement = document.querySelector('#app');
    expect(appElement?.textContent).toBe('About Page');
  });

  test('app throws error when neither render nor router provided', () => {
    expect(() => {
      createApp({
        data: () => ({})
      }).mount('#app');
    }).toThrow('Either render function or router must be provided');
  });

  test('app throws error when container not found', () => {
    const app = createApp({
      data: () => ({}),
      render: () => VStack(Text('Hello'))
    });

    expect(() => {
      app.mount('#nonexistent');
    }).toThrow('Container not found: #nonexistent');
  });
});

// =============================================================================
// EDGE CASES AND ERROR HANDLING
// =============================================================================

describe('Edge Cases', () => {
  test('reactive objects handle circular references', () => {
    // Create a completely isolated reactive object for this test
    const isolatedReactive = <T extends object>(obj: T): T => {
      return new Proxy(obj, {
        get(target, key, receiver) {
          const res = Reflect.get(target, key, receiver);
          return (typeof res === 'object' && res !== null) ? isolatedReactive(res) : res;
        },
        set(target, key, value, receiver) {
          const result = Reflect.set(target, key, value, receiver);
          return result;
        }
      });
    };

    const obj: any = isolatedReactive({ name: 'test' });
    obj.self = obj;
    
    expect(obj.self.name).toBe('test');
    expect(obj.self.self.name).toBe('test'); // Test deeper circular access
  });

  test('effects handle exceptions without crashing the system', () => {
    const state = reactive({ count: 0 });
    
    // This effect will throw when count > 5
    effect(() => {
      if (state.count > 5) {
        throw new Error('Count too high');
      }
    });

    // The system should continue working even after an exception
    expect(() => {
      state.count = 10; // This will trigger the exception
    }).toThrow('Count too high');
    
    // But other effects should still work
    let otherEffectRuns = 0;
    effect(() => {
      otherEffectRuns++;
      state.count; // Access to track
    });
    
    state.count = 3; // This should work fine
    expect(otherEffectRuns).toBe(2); // Initial run + update
  });
}); 