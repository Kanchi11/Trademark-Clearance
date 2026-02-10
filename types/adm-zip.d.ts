declare module 'adm-zip' {
  export default class AdmZip {
    constructor(file?: string);
    getEntries(): any[];
   extractAllTo(targetPath: string, overwrite?: boolean): void;
  }
}
