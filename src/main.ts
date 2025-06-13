/**
 * Main Application Entry Point
 * Demonstrates the MiniVue framework with routing and multiple pages
 */

import { 
  createApp, 
  createRouter,
  Text, 
  Button, 
  VStack, 
  HStack, 
  TextField, 
  Link 
} from './miniVue';

// =============================================================================
// PAGE COMPONENTS
// =============================================================================

/**
 * Home Page - Interactive counter and text input
 */
const HomePage = (state: any) => VStack(
  Text('🏠 Home Page'),
  Text(`Counter: ${state.count}`),
  Button('Increment', () => state.count++),
  TextField(state.text, (value) => state.text = value, 'Enter some text...'),
  
  // Navigation
  HStack(
    Link('About', '/about'),
    Link('Contact', '/contact')
  )
);

/**
 * About Page - Information about the framework
 */
const AboutPage = (state: any) => VStack(
  Text('ℹ️ About This Framework'),
  Text('MiniVue is a minimal SwiftUI-like framework built with TypeScript.'),
  Text(''),
  Text('🚀 Features:'),
  Text('• Reactive state management'),
  Text('• Virtual DOM with efficient diffing'),
  Text('• Component-based architecture'),
  Text('• Client-side routing'),
  Text('• TypeScript support'),
  
  // Navigation
  HStack(
    Link('Home', '/'),
    Link('Contact', '/contact')
  )
);

/**
 * Contact Page - Contact form with validation
 */
const ContactPage = (state: any) => VStack(
  Text('📧 Contact Us'),
  Text('Send us a message:'),
  
  TextField(state.email, (value) => state.email = value, 'Your email...'),
  TextField(state.message, (value) => state.message = value, 'Your message...'),
  
  Button('Send Message', () => {
    if (state.email && state.message) {
      alert(`Message sent!\nFrom: ${state.email}\nMessage: ${state.message}`);
      state.email = '';
      state.message = '';
    } else {
      alert('Please fill in both email and message fields.');
    }
  }),
  
  // Navigation
  HStack(
    Link('Home', '/'),
    Link('About', '/about')
  )
);

/**
 * 404 Not Found Page
 */
const NotFoundPage = () => VStack(
  Text('❌ 404 - Page Not Found'),
  Text('The page you are looking for does not exist.'),
  Link('Go Home', '/')
);

// =============================================================================
// APPLICATION SETUP
// =============================================================================

/**
 * Define application routes
 */
const router = createRouter([
  { path: '/', component: HomePage },
  { path: '/about', component: AboutPage },
  { path: '/contact', component: ContactPage },
  { path: '*', component: NotFoundPage }
]);

/**
 * Initialize and mount the application
 */
const app = createApp({
  // Initial application state
  data: () => ({
    count: 0,
    text: '',
    email: '',
    message: ''
  }),
  
  // Router configuration
  router
});

// Mount the app
app.mount('#app');

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  app.unmount();
});



// const count = Constant(0)
// const button = Button('Click me')

// pipe(press, button, increment, count)

// const view = VStack(Text(counter), button)
// Textfield(switch("enter your email", bind(email)))
// render(view)