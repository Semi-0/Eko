
import { createApp, Text, Button, VStack, TextField } from './miniVue';
createApp({
  data: () => ({ count: 0 , text: ''}),
  render(ctx) {
    return VStack(
      Text(`You clicked ${ctx.count} times`),
      Button('Click me', () => ctx.count++),
      TextField(ctx.text, (newValue) => ctx.text = newValue),
    );
  }
}).mount('#app');
