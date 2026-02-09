import { injectable } from 'inversify';
import { ISimilarityEngine, SimilarityBreakdown } from './ISimilarityEngine';
import { calculateSimilarityWithBreakdown } from '../../../lib/similarity';

@injectable()
export class SimilarityEngine implements ISimilarityEngine {
  
  calculateSimilarity(mark1: string, mark2: string): SimilarityBreakdown {
    return calculateSimilarityWithBreakdown(mark1, mark2);
  }
}