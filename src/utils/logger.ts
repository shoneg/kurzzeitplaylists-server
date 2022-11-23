import { GLOBAL_DEBUG as GLOBAL_DEBUG_ENV } from '../config';

const GLOBAL_DEBUG: DEBUG | undefined = GLOBAL_DEBUG_ENV;

export enum DEBUG {
  LOG,
  INFO,
  WARN,
  ERROR,
}

export default class Logger {
  private debug: DEBUG;
  private tag: string;

  public constructor(debug: DEBUG, tag: string) {
    this.debug = GLOBAL_DEBUG ?? debug;
    this.tag = `[${tag}]`;
  }

  // private messageMapper = (messages: any[]) => messages.map((m) => JSON.stringify(m, null, 2));
  private messageMapper = (x: any[]) => x;

  public log(...messages: any[]) {
    if (this.debug == 0) {
      const newMessages = this.messageMapper(messages);
      console.log(this.tag, ...newMessages);
    }
  }
  public info(...messages: any[]) {
    if (this.debug <= 1) {
      const newMessages = this.messageMapper(messages);
      console.info(this.tag, ...newMessages);
    }
  }
  public warn(...messages: any[]) {
    if (this.debug <= 2) {
      const newMessages = this.messageMapper(messages);
      console.warn(this.tag, ...newMessages);
    }
  }
  public error(...messages: any[]) {
    const newMessages = this.messageMapper(messages);
    console.error(this.tag, ...newMessages);
  }
  public forceLog(...messages: any[]) {
    const newMessages = this.messageMapper(messages);
    console.log(this.tag, ...newMessages);
  }
}
