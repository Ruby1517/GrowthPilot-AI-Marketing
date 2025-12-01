declare module "formidable" {
  import type { IncomingMessage } from "http";
  import { EventEmitter } from "events";

  export type Fields = Record<string, any>;
  export type Files = Record<string, any>;

  export interface Options {
    multiples?: boolean;
    keepExtensions?: boolean;
    maxFileSize?: number;
  }

  export interface Formidable extends EventEmitter {
    parse(
      req: IncomingMessage,
      callback: (err: any, fields: Fields, files: Files) => void
    ): void;
  }

  function formidable(options?: Options): Formidable;
  export default formidable;
}
