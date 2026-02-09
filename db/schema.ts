// src/db/schema.ts
import { 
    pgTable, 
    text, 
    integer, 
    timestamp, 
    uuid, 
    serial,
    date,
    pgEnum,
  } from 'drizzle-orm/pg-core';
  
  // Enums
  export const statusEnum = pgEnum('status', ['live', 'dead', 'pending', 'abandoned']);
  export const riskLevelEnum = pgEnum('risk_level', ['low', 'medium', 'high']);
  export const searchStatusEnum = pgEnum('search_status', ['pending', 'processing', 'completed', 'failed']);
  
  // USPTO Trademarks Table
  export const usptoTrademarks = pgTable('uspto_trademarks', {
    id: serial('id').primaryKey(),
    serialNumber: text('serial_number').unique().notNull(),
    markText: text('mark_text').notNull(),
    markTextNormalized: text('mark_text_normalized').notNull(),
    markSoundex: text('mark_soundex'),
    status: statusEnum('status').notNull(),
    filingDate: date('filing_date'),
    registrationDate: date('registration_date'),
    ownerName: text('owner_name'),
    niceClasses: integer('nice_classes').array().notNull(),
    goodsServices: text('goods_services'),
    usptoUrl: text('uspto_url'),
    createdAt: timestamp('created_at').defaultNow(),
  });
  
  // Searches Table
  export const searches = pgTable('searches', {
    id: uuid('id').primaryKey().defaultRandom(),
    markText: text('mark_text').notNull(),
    markTextNormalized: text('mark_text_normalized').notNull(),
    logoUrl: text('logo_url'),
    niceClasses: integer('nice_classes').array().notNull(),
    goodsServices: text('goods_services'),
    totalResults: integer('total_results'),
    highRiskCount: integer('high_risk_count'),
    mediumRiskCount: integer('medium_risk_count'),
    lowRiskCount: integer('low_risk_count'),
    overallRiskScore: integer('overall_risk_score'),
    overallRiskLevel: riskLevelEnum('overall_risk_level'),
    status: searchStatusEnum('status').default('pending').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    completedAt: timestamp('completed_at'),
  });
  
  // Search Results Table
  export const searchResults = pgTable('search_results', {
    id: uuid('id').primaryKey().defaultRandom(),
    searchId: uuid('search_id').notNull(),
    serialNumber: text('serial_number').notNull(),
    markText: text('mark_text').notNull(),
    ownerName: text('owner_name'),
    status: statusEnum('status').notNull(),
    filingDate: date('filing_date'),
    niceClasses: integer('nice_classes').array(),
    similarityScore: integer('similarity_score').notNull(),
    riskLevel: riskLevelEnum('risk_level').notNull(),
    usptoUrl: text('uspto_url'),
    screenshotUrl: text('screenshot_url'),
    createdAt: timestamp('created_at').defaultNow(),
  });