/*
 * mini-swiftui-framework.ts
 * A minimal SwiftUI–like framework in TypeScript targeting the DOM
 * Features:
 * - reactive() creates a proxy for reactivity
 * - effect() registers reactive effects
 * - DSL functions: Text, Button, VStack, HStack, ZStack, Image, Rectangle, Circle, TextField
 * - createApp() bootstraps with a render(ctx) function returning VNodes
 */

// --- Reactivity core (unchanged) ---
export type EffectFn = () => void;
let activeEffect: EffectFn | null = null;
const targetMap = new WeakMap<object, Map<string | symbol, Set<EffectFn>>>();

function track(target: object, key: string | symbol) {
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

function trigger(target: object, key: string | symbol) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const dep = depsMap.get(key);
  if (!dep) return;
  dep.forEach(fn => fn());
}

export function reactive<T extends object>(obj: T): T {
  return new Proxy(obj, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver);
      track(target, key);
      return (typeof res === 'object' && res !== null) ? reactive(res) : res;
    },
    set(target, key, value, receiver) {
      const oldVal = (target as any)[key];
      const result = Reflect.set(target, key, value, receiver);
      if (oldVal !== value) trigger(target, key);
      return result;
    }
  });
}

export function effect(fn: EffectFn) {
  activeEffect = fn;
  fn();
  activeEffect = null;
}

// --- VNode and DSL ---
export type VNode = {
  tag: string;
  props?: Record<string, any>;
  children: Array<VNode | string>;
};

export function Text(content: string): string {
  return content;
}

export function Button(label: string, onClick: () => void): VNode {
  return {
    tag: 'button',
    props: {
      onclick: onClick,
      style: 'padding:8px;border:none;border-radius:4px;background:#007AFF;color:white;cursor:pointer;'
    },
    children: [label]
  };
}

export function VStack(...children: Array<VNode | string>): VNode {
  return {
    tag: 'div',
    props: { style: 'display:flex;flex-direction:column;gap:8px;' },
    children
  };
}

export function HStack(...children: Array<VNode | string>): VNode {
  return {
    tag: 'div',
    props: { style: 'display:flex;flex-direction:row;gap:8px;' },
    children
  };
}

export function ZStack(...children: (VNode | string)[]): VNode {
  return { tag: 'div', props: { style: 'position:relative;' }, children };
}

export function Image(src: string, frame?: { x: number; y: number; width: number; height: number }): VNode {
  const styleParts: string[] = [];
  if (frame) {
    styleParts.push(
      `position:absolute;left:${frame.x}px;top:${frame.y}px;width:${frame.width}px;height:${frame.height}px;`
    );
  }
  return { tag: 'img', props: { src, style: styleParts.join('') }, children: [] };
}

export function Rectangle(fill: string, frame: { x: number; y: number; width: number; height: number }): VNode {
  const style =
    `position:absolute;left:${frame.x}px;top:${frame.y}px;width:${frame.width}px;height:${frame.height}px;background:${fill};`;
  return { tag: 'div', props: { style }, children: [] };
}

export function Circle(fill: string, frame: { x: number; y: number; width: number; height: number }): VNode {
  const diameter = Math.min(frame.width, frame.height);
  const style =
    `position:absolute;left:${frame.x}px;top:${frame.y}px;width:${diameter}px;height:${diameter}px;background:${fill};border-radius:50%;`;
  return { tag: 'div', props: { style }, children: [] };
}

// --- New: TextField DSL ---
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
      style: 'padding:4px;border:1px solid #ccc;border-radius:4px;'
    },
    children: []
  };
}

// --- Renderer (updated to support generic events) ---
function createElement(v: VNode | string): Node {
  if (typeof v === 'string') return document.createTextNode(v);
  const el = document.createElement(v.tag);
  if (v.props) {
    for (const [k, val] of Object.entries(v.props)) {
      if (k.startsWith('on') && typeof val === 'function') {
        const eventName = k.slice(2).toLowerCase();
        el.addEventListener(eventName, val);
      } else {
        el.setAttribute(k, String(val));
      }
    }
  }
  v.children.forEach(c => el.appendChild(createElement(c)));
  return el;
}

// --- Application bootstrap ---
export function createApp(options: {
  data: () => Record<string, any>;
  render: (ctx: any) => VNode;
}) {
  return {
    mount(rootSelector: string) {
      const root = document.querySelector(rootSelector);
      if (!root) throw new Error(`Container not found: ${rootSelector}`);
      const state = reactive(options.data());
      effect(() => {
        root.innerHTML = '';
        const tree = options.render(state);
        root.appendChild(createElement(tree));
      });
    }
  };
}
