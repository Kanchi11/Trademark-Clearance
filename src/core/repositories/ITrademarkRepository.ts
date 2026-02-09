export interface ITrademarkRepository {
    searchByMark(markText: string, classes?: number[]): Promise<any[]>;
    findBySerialNumber(serialNumber: string): Promise<any | null>;
    count(): Promise<number>;
  }