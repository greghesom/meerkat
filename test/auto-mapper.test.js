import { AutoMapper } from '../src/diagram-view/mapping/auto-mapper.js';

describe('AutoMapper', () => {
  let mapper;

  beforeEach(() => {
    mapper = new AutoMapper();
  });

  describe('initialization', () => {
    it('should create an instance', () => {
      expect(mapper).toBeTruthy();
      expect(mapper).toBeInstanceOf(AutoMapper);
    });
  });

  describe('calculateConfidence', () => {
    const shape = {
      id: 'shape1',
      label: 'API Gateway'
    };

    it('should return 1.0 for exact label match', () => {
      const confidence = mapper.calculateConfidence('api gateway', shape);
      expect(confidence).toBe(1.0);
    });

    it('should return 0.95 for exact ID match', () => {
      const confidence = mapper.calculateConfidence('shape1', shape);
      expect(confidence).toBe(0.95);
    });

    it('should return 0.7 when label contains term', () => {
      const confidence = mapper.calculateConfidence('api', shape);
      expect(confidence).toBe(0.7);
    });

    it('should return 0.6 when term contains label', () => {
      const shape2 = { id: 's2', label: 'API' };
      const confidence = mapper.calculateConfidence('api gateway', shape2);
      expect(confidence).toBe(0.6);
    });

    it('should return 0 for no match', () => {
      const confidence = mapper.calculateConfidence('database', shape);
      expect(confidence).toBe(0);
    });

    it('should return 0 for empty term', () => {
      const confidence = mapper.calculateConfidence('', shape);
      expect(confidence).toBe(0);
    });

    it('should handle word boundaries for fuzzy matching', () => {
      const shape2 = { id: 's2', label: 'User Service' };
      const confidence = mapper.calculateConfidence('user-api-service', shape2);
      expect(confidence).toBeGreaterThan(0);
    });
  });

  describe('findMatches', () => {
    const shapes = [
      { id: 'shape1', label: 'API Gateway' },
      { id: 'shape2', label: 'User Service' },
      { id: 'shape3', label: 'Database' }
    ];

    it('should find exact match', () => {
      const participant = { id: 'gateway', displayName: 'API Gateway' };
      const matches = mapper.findMatches(participant, shapes);
      
      expect(matches.length).toBe(1);
      expect(matches[0].shape.id).toBe('shape1');
      expect(matches[0].confidence).toBe(1.0);
    });

    it('should find multiple matches sorted by confidence', () => {
      const participant = { id: 'api', displayName: 'API' };
      const matches = mapper.findMatches(participant, shapes);
      
      expect(matches.length).toBeGreaterThan(0);
      // Verify sorted by confidence
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].confidence).toBeGreaterThanOrEqual(matches[i].confidence);
      }
    });

    it('should return empty array when no matches found', () => {
      const participant = { id: 'nonexistent', displayName: 'Nonexistent Service' };
      const matches = mapper.findMatches(participant, shapes);
      
      expect(matches).toEqual([]);
    });

    it('should filter out low confidence matches', () => {
      const participant = { id: 'xyz', displayName: 'xyz' };
      const matches = mapper.findMatches(participant, shapes);
      
      // All matches should have confidence > 0.5
      matches.forEach(match => {
        expect(match.confidence).toBeGreaterThan(0.5);
      });
    });
  });

  describe('map', () => {
    const participants = [
      { id: 'gateway', displayName: 'API Gateway' },
      { id: 'user_svc', displayName: 'User Service' },
      { id: 'unknown', displayName: 'Unknown Service' }
    ];

    const shapes = [
      { id: 'shape1', label: 'API Gateway' },
      { id: 'shape2', label: 'User Service' }
    ];

    it('should map participants to shapes', () => {
      const result = mapper.map(participants, shapes);
      
      expect(result.mappings.length).toBe(2);
      expect(result.unmapped.length).toBe(1);
      expect(result.ambiguous.length).toBe(0);
    });

    it('should create correct mapping objects', () => {
      const result = mapper.map(participants, shapes);
      
      const gatewayMapping = result.mappings.find(m => m.participantId === 'gateway');
      expect(gatewayMapping).toBeTruthy();
      expect(gatewayMapping.shapeId).toBe('shape1');
      expect(gatewayMapping.shapeLabel).toBe('API Gateway');
      expect(gatewayMapping.confidence).toBe(1.0);
      expect(gatewayMapping.autoMapped).toBe(true);
    });

    it('should identify unmapped participants', () => {
      const result = mapper.map(participants, shapes);
      
      expect(result.unmapped.length).toBe(1);
      expect(result.unmapped[0].participant.id).toBe('unknown');
      expect(result.unmapped[0].reason).toBe('No matching shapes found');
    });

    it('should handle explicit shapeId annotation', () => {
      const participantsWithExplicit = [
        { id: 'gateway', displayName: 'API Gateway', shapeId: 'shape2' }
      ];
      
      const result = mapper.map(participantsWithExplicit, shapes);
      
      expect(result.mappings.length).toBe(1);
      expect(result.mappings[0].shapeId).toBe('shape2');
      expect(result.mappings[0].autoMapped).toBe(false);
      expect(result.mappings[0].confidence).toBe(1.0);
    });

    it('should handle ambiguous matches', () => {
      const ambiguousParticipants = [
        { id: 'service', displayName: 'Service' }
      ];
      
      const ambiguousShapes = [
        { id: 'shape1', label: 'User Service' },
        { id: 'shape2', label: 'Payment Service' },
        { id: 'shape3', label: 'Auth Service' }
      ];
      
      const result = mapper.map(ambiguousParticipants, ambiguousShapes);
      
      // Should have ambiguous matches when multiple shapes match
      if (result.ambiguous.length > 0) {
        expect(result.ambiguous[0].participant.id).toBe('service');
        expect(result.ambiguous[0].candidates.length).toBeGreaterThan(1);
      }
    });

    it('should handle empty inputs', () => {
      const result = mapper.map([], []);
      
      expect(result.mappings).toEqual([]);
      expect(result.unmapped).toEqual([]);
      expect(result.ambiguous).toEqual([]);
    });
  });
});
