/**
 * Domain Entity: Trademark
 * Represents a trademark in our system
 */

export class Trademark {
    constructor(
      public readonly id: number,
      public readonly serialNumber: string,
      public readonly markText: string,
      public readonly ownerName: string,
      public readonly status: TrademarkStatus,
      public readonly filingDate: string,
      public readonly registrationDate: string | null,
      public readonly niceClasses: number[],
      public readonly goodsAndServices: string | null,
      public readonly metadata: TrademarkMetadata
    ) {}
  
    /**
     * Is this trademark currently active?
     */
    isActive(): boolean {
      return this.status === TrademarkStatus.LIVE;
    }
  
    /**
     * Is this trademark in a conflictable state?
     */
    canConflict(): boolean {
      return this.status === TrademarkStatus.LIVE || 
             this.status === TrademarkStatus.PENDING;
    }
  
    /**
     * Get age of trademark in years
     */
    getAge(): number {
      const filingYear = new Date(this.filingDate).getFullYear();
      const currentYear = new Date().getFullYear();
      return currentYear - filingYear;
    }
  
    /**
     * Does this trademark overlap with given Nice classes?
     */
    hasClassOverlap(classes: number[]): boolean {
      return this.niceClasses.some(c => classes.includes(c));
    }
  
    /**
     * Convert to plain object (for serialization)
     */
    toJSON() {
      return {
        id: this.id,
        serialNumber: this.serialNumber,
        markText: this.markText,
        ownerName: this.ownerName,
        status: this.status,
        filingDate: this.filingDate,
        registrationDate: this.registrationDate,
        niceClasses: this.niceClasses,
        goodsAndServices: this.goodsAndServices,
        metadata: this.metadata,
      };
    }
  
    /**
     * Create from database row
     */
    static fromDatabase(row: any): Trademark {
      return new Trademark(
        row.id,
        row.serialNumber,
        row.markText,
        row.ownerName,
        row.status as TrademarkStatus,
        row.filingDate,
        row.registrationDate || null,
        row.niceClasses,
        row.goodsAndServices || null,
        {
          markSoundex: row.markSoundex,
          markMetaphone: row.markMetaphone,
          markTextNormalized: row.markTextNormalized,
        }
      );
    }
  }
  
  export enum TrademarkStatus {
    LIVE = 'live',
    DEAD = 'dead',
    PENDING = 'pending',
    ABANDONED = 'abandoned',
  }
  
  export interface TrademarkMetadata {
    markSoundex: string;
    markMetaphone: string;
    markTextNormalized: string;
  }