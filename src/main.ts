
import { createApp, Text, Button, VStack } from './miniVue';
createApp({
  data: () => ({ count: 0 }),
  render(ctx) {
    return VStack(
      Text(`You clicked ${ctx.count} times`),
      Button('Click me', () => ctx.count++),
    );
  }
}).mount('#app');
