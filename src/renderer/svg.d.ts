// esbuild inlines .svg files as text (see build.mjs).
declare module '*.svg' {
  const markup: string;
  export default markup;
}
