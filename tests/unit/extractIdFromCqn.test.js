const { extractIdFromCqn } = require('../../lib/helper')

describe('ID Extraction Helper Function', () => {
  test('should extract ID from many attachments case (where clause on last ref)', () => {
    const cqn = {
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
    
    const result = extractIdFromCqn(cqn)
    expect(result).toEqual({ id: 'attachment-id-456', isSingleAttachment: false })
  })

  test('should extract ID from single attachment case (where clause on first ref)', () => {
    const cqn = {
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
    
    const result = extractIdFromCqn(cqn)
    expect(result).toEqual({ id: '23ea8fec-6168-4f53-9f06-a60789a66bf8', isSingleAttachment: true })
  })

  test('should extract ID from complex where clause with multiple conditions', () => {
    const cqn = {
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
    
    const result = extractIdFromCqn(cqn)
    expect(result).toEqual({ id: 'complex-id-789', isSingleAttachment: true })
  })

  test('should handle where clause directly on from object', () => {
    const cqn = {
      SELECT: {
        from: {
          ref: ["SomeEntity"],
          where: [
            { ref: ["ID"] },
            "=",
            { val: "direct-where-id" }
          ]
        }
      }
    }
    
    const result = extractIdFromCqn(cqn)
    expect(result).toEqual({ id: 'direct-where-id', isSingleAttachment: false })
  })

  test('should return null when no ID is found', () => {
    const cqn = {
      SELECT: {
        from: {
          ref: [
            {
              where: [
                { ref: ["name"] },
                "=",
                { val: "test" }
              ]
            }
          ]
        }
      }
    }
    
    const result = extractIdFromCqn(cqn)
    expect(result).toBeNull()
  })

  test('should return null when CQN is malformed', () => {
    expect(extractIdFromCqn(null)).toBeNull()
    expect(extractIdFromCqn({})).toBeNull()
    expect(extractIdFromCqn({ SELECT: {} })).toBeNull()
    expect(extractIdFromCqn({ SELECT: { from: {} } })).toBeNull()
  })

  test('should handle ID appearing in different positions in where clause', () => {
    const cqn = {
      SELECT: {
        from: {
          ref: [
            {
              where: [
                { ref: ["name"] },
                "=",
                { val: "test" },
                "and",
                { ref: ["status"] },
                "=",
                { val: "active" },
                "and", 
                { ref: ["ID"] },
                "=",
                { val: "position-test-id" }
              ]
            }
          ]
        }
      }
    }
    
    const result = extractIdFromCqn(cqn)
    expect(result).toEqual({ id: 'position-test-id', isSingleAttachment: false })
  })

  test('should extract first ID when multiple IDs exist', () => {
    const cqn = {
      SELECT: {
        from: {
          ref: [
            {
              where: [
                { ref: ["ID"] },
                "=",
                { val: "first-id" },
                "and",
                { ref: ["parentID"] },
                "=",
                { val: "parent-id" }
              ]
            }
          ]
        }
      }
    }
    
    const result = extractIdFromCqn(cqn)
    expect(result).toEqual({ id: 'first-id', isSingleAttachment: false })
  })
})