/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL?: string;
  readonly VITE_AI_CODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
