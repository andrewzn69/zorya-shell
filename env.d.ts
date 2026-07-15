declare const SRC: string

// GJS provides the WHATWG Encoding API as globals; not in the ES lib
declare class TextDecoder {
  constructor(label?: string)
  decode(input?: ArrayBufferView | ArrayBuffer): string
}

declare module "inline:*" {
  const content: string
  export default content
}

declare module "*.scss" {
  const content: string
  export default content
}

declare module "*.blp" {
  const content: string
  export default content
}

declare module "*.css" {
  const content: string
  export default content
}
