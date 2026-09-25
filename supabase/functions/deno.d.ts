declare module "https://*" {
  const content: any;
  export default content;
  export const serve: any;
  export const createClient: any;
}

declare module "http://*" {
  const content: any;
  export default content;
}

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): Record<string, string>;
  }
  export const env: Env;
}
