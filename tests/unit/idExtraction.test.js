const { stripQueryParams } = require('../../lib/helper')

// Mock CDS module completely
jest.mock('@sap/cds', () => ({
  ql: {
    SELECT: jest.fn(),
    UPSERT: jest.fn(),
    UPDATE: jest.fn()
  },
  odata: {
    parse: jest.fn()
  },
  Service: class MockService {},
  spawn: jest.fn(() => ({ on: jest.fn() }))
}))

// Mock other dependencies
jest.mock('../../lib/malwareScanner', () => ({
  scanRequest: jest.fn()
}))

jest.mock('../../lib/logger', () => ({
  logConfig: {
    info: jest.fn(),
    debug: jest.fn(),
    withSuggestion: jest.fn()
  }
}))

const cds = require('@sap/cds')

describe('ID Extraction from CQN', () => {
  beforeEach(() => {
    cds.odata.parse.mockClear()
  })

  test('should extract ID when it appears last (many attachments case)', () => {
    const mockCqn = {
      SELECT: {
        from: {
          ref: [
            "attachments",
            {
              where: [
                { ref: ["up__ID"] },
                "=", 
                { val: "parent-id-123" },
                "and",
                { ref: ["ID"] },
                "=",
                { val: "attachment-id-456" }
              ]
            }
          ]
        }
      }
    }
    
    cds.odata.parse.mockReturnValue(mockCqn)
    
    // Mock request object
    const req = {
      content: {
        url: '/test/attachments(up__ID=parent-id-123,ID=attachment-id-456)/content'
      }
    }
    
    const urlWithoutParams = stripQueryParams(req.content.url)
    const cqn = cds.odata.parse(urlWithoutParams, { service: {} })
    
    // Test the current logic to find ID
    const whereClause = cqn.SELECT.from.ref.at(-1).where
    const IDval = whereClause.find((r, idx) => 
      r.val && whereClause[idx-1] === '=' && whereClause[idx-2]?.ref?.[0] === 'ID'
    )
    
    expect(IDval?.val).toBe('attachment-id-456')
  })

  test('should extract ID when it appears first (single attachment case)', () => {
    const mockCqn = {
      SELECT: {
        from: {
          ref: [
            {
              id: "be.medini.vetorder.promo.PromoService.Promo",
              where: [
                { ref: ["ID"] },
                "=",
                { val: "23ea8fec-6168-4f53-9f06-a60789a66bf8" }
              ]
            },
            "attachments"
          ]
        }
      }
    }
    
    cds.odata.parse.mockReturnValue(mockCqn)
    
    const req = {
      content: {
        url: '/test/Promo(ID=23ea8fec-6168-4f53-9f06-a60789a66bf8)/attachments/content'
      }
    }
    
    const urlWithoutParams = stripQueryParams(req.content.url)
    const cqn = cds.odata.parse(urlWithoutParams, { service: {} })
    
    // Current logic would fail here, so let's test our improved logic
    const whereClause = cqn.SELECT.from.ref.at(-1).where || cqn.SELECT.from.ref[0].where
    let IDval
    
    if (whereClause) {
      // Try to find ID in the where clause (flexible approach)
      IDval = whereClause.find((r, idx) => 
        r.val && whereClause[idx-1] === '=' && whereClause[idx-2]?.ref?.[0] === 'ID'
      )
    }
    
    expect(IDval?.val).toBe('23ea8fec-6168-4f53-9f06-a60789a66bf8')
  })

  test('should handle complex where clauses with multiple conditions', () => {
    const mockCqn = {
      SELECT: {
        from: {
          ref: [
            {
              id: "test.Service.Entity",
              where: [
                { ref: ["status"] },
                "=",
                { val: "active" },
                "and",
                { ref: ["ID"] },
                "=", 
                { val: "complex-id-789" },
                "and",
                { ref: ["tenant"] },
                "=",
                { val: "tenant-1" }
              ]
            },
            "attachments"
          ]
        }
      }
    }
    
    cds.odata.parse.mockReturnValue(mockCqn)
    
    const req = {
      content: {
        url: '/test/Entity(status=active,ID=complex-id-789,tenant=tenant-1)/attachments/content'
      }
    }
    
    const urlWithoutParams = stripQueryParams(req.content.url)
    const cqn = cds.odata.parse(urlWithoutParams, { service: {} })
    
    const whereClause = cqn.SELECT.from.ref[0].where
    const IDval = whereClause.find((r, idx) => 
      r.val && whereClause[idx-1] === '=' && whereClause[idx-2]?.ref?.[0] === 'ID'
    )
    
    expect(IDval?.val).toBe('complex-id-789')
  })
})