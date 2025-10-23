// Integration test for ID extraction with different attachment scenarios

// Mock the SELECT function properly to match CDS API
const mockSelect = {
  from: jest.fn().mockReturnValue({
    columns: jest.fn().mockResolvedValue(null)
  })
}

// Mock CDS module for integration testing  
jest.mock('@sap/cds', () => ({
  ql: {
    SELECT: mockSelect,
    UPSERT: jest.fn(),
    UPDATE: jest.fn()
  },
  odata: {
    parse: jest.fn()
  },
  Service: class MockService {},
  spawn: jest.fn(() => ({ on: jest.fn() }))
}))

jest.mock('../../lib/malwareScanner', () => ({
  scanRequest: jest.fn()
}))

jest.mock('../../lib/logger', () => ({
  logConfig: {
    info: jest.fn(),
    debug: jest.fn(),
    withSuggestion: jest.fn(),
    error: jest.fn()
  }
}))

const cds = require('@sap/cds')
const AttachmentsService = require('../../lib/basic')

describe('ID Extraction Integration Tests', () => {
  let attachmentsService

  beforeEach(() => {
    attachmentsService = new AttachmentsService()
    jest.clearAllMocks()
  })

  test('should handle single attachment scenario (Composition of Attachments)', async () => {
    // Mock the CQN structure for single attachment
    const singleAttachmentCqn = {
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

    cds.odata.parse.mockReturnValue(singleAttachmentCqn)

    // Mock SELECT to return existing attachment metadata
    const mockExistingRecord = {
      filename: "test-document.pdf",
      mimeType: "application/pdf", 
      url: "promo/23ea8fec-6168-4f53-9f06-a60789a66bf8#test-document.pdf"
    }
    
    // Reset and configure the mock
    mockSelect.from.mockClear()
    const mockColumns = jest.fn().mockResolvedValue(mockExistingRecord)
    mockSelect.from.mockReturnValue({ columns: mockColumns })

    // Mock the put method to track what data was passed
    const putSpy = jest.spyOn(attachmentsService, 'put').mockResolvedValue([])

    const req = {
      content: {
        url: '/odata/v4/promo/Promo(ID=23ea8fec-6168-4f53-9f06-a60789a66bf8)/attachments/content',
        type: 'application/pdf'
      }
    }

    const mockAttachment = { name: 'TestAttachments' }
    const mockSrv = {}

    await attachmentsService.nonDraftHandler(req, mockAttachment, mockSrv)

    // Verify SELECT was called correctly
    expect(mockSelect.from).toHaveBeenCalledWith(mockAttachment, { ID: '23ea8fec-6168-4f53-9f06-a60789a66bf8' })
    expect(mockColumns).toHaveBeenCalledWith("filename", "mimeType", "url")

    // Verify that the correct data including filename was passed to put method
    expect(putSpy).toHaveBeenCalledWith(
      mockAttachment,
      [{
        ID: '23ea8fec-6168-4f53-9f06-a60789a66bf8',
        content: req.content,
        filename: 'test-document.pdf',
        mimeType: 'application/pdf',
        url: 'promo/23ea8fec-6168-4f53-9f06-a60789a66bf8#test-document.pdf'
      }],
      null,
      false
    )
  })

  test('should handle many attachments scenario (Composition of many Attachments)', async () => {
    // Mock the CQN structure for many attachments
    const manyAttachmentsCqn = {
      SELECT: {
        from: {
          ref: [
            "attachments",
            {
              where: [
                { ref: ["up__ID"] },
                "=", 
                { val: "3ccf474c-3881-44b7-99fb-59a2a4668418" },
                "and",
                { ref: ["ID"] },
                "=",
                { val: "attachment-567-890" }
              ]
            }
          ]
        }
      }
    }

    cds.odata.parse.mockReturnValue(manyAttachmentsCqn)

    // Mock SELECT to return existing attachment metadata  
    const mockExistingRecord = {
      filename: "incident-report.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      url: "incidents/attachment-567-890#incident-report.xlsx"
    }
    
    mockSelect.from.mockClear()
    const mockColumns = jest.fn().mockResolvedValue(mockExistingRecord)
    mockSelect.from.mockReturnValue({ columns: mockColumns })

    const putSpy = jest.spyOn(attachmentsService, 'put').mockResolvedValue([])

    const req = {
      content: {
        url: '/odata/v4/processor/Incidents(ID=3ccf474c-3881-44b7-99fb-59a2a4668418)/attachments(up__ID=3ccf474c-3881-44b7-99fb-59a2a4668418,ID=attachment-567-890)/content',
        data: 'mock file content'
      }
    }

    const mockAttachment = { name: 'IncidentAttachments' }
    const mockSrv = {}

    await attachmentsService.nonDraftHandler(req, mockAttachment, mockSrv)

    // Verify SELECT was called correctly
    expect(mockSelect.from).toHaveBeenCalledWith(mockAttachment, { ID: 'attachment-567-890' })
    expect(mockColumns).toHaveBeenCalledWith("filename", "mimeType", "url")

    // Verify that the correct attachment data including metadata was extracted
    expect(putSpy).toHaveBeenCalledWith(
      mockAttachment,
      [{
        ID: 'attachment-567-890',
        content: req.content,
        filename: 'incident-report.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        url: 'incidents/attachment-567-890#incident-report.xlsx'
      }],
      null,
      false
    )
  })

  test('should handle URLs with query parameters correctly', async () => {
    const cqnWithQueryParams = {
      SELECT: {
        from: {
          ref: [
            {
              id: "be.medini.vetorder.promo.PromoService.Promo",
              where: [
                { ref: ["ID"] },
                "=",
                { val: "query-param-test-id" }
              ]
            },
            "attachments"
          ]
        }
      }
    }

    cds.odata.parse.mockReturnValue(cqnWithQueryParams)
    
    // Mock SELECT to return existing attachment metadata
    const mockExistingRecord = {
      filename: "query-test.pdf",
      mimeType: "application/pdf",
      url: "promo/query-param-test-id#query-test.pdf"
    }
    
    mockSelect.from.mockClear()
    const mockColumns = jest.fn().mockResolvedValue(mockExistingRecord)
    mockSelect.from.mockReturnValue({ columns: mockColumns })
    
    const putSpy = jest.spyOn(attachmentsService, 'put').mockResolvedValue([])

    const req = {
      content: {
        url: '/odata/v4/promo/Promo(ID=query-param-test-id)/attachments/content?timestamp=1234567890&version=2',
        buffer: Buffer.from('test content')
      }
    }

    const mockAttachment = { name: 'PromoAttachments' }
    const mockSrv = {}

    await attachmentsService.nonDraftHandler(req, mockAttachment, mockSrv)

    // Verify URL was stripped of query params and ID extracted correctly
    expect(cds.odata.parse).toHaveBeenCalledWith(
      '/odata/v4/promo/Promo(ID=query-param-test-id)/attachments/content',
      { service: mockSrv }
    )

    // Verify SELECT was called correctly
    expect(mockSelect.from).toHaveBeenCalledWith(mockAttachment, { ID: 'query-param-test-id' })
    expect(mockColumns).toHaveBeenCalledWith("filename", "mimeType", "url")

    expect(putSpy).toHaveBeenCalledWith(
      mockAttachment,
      [{
        ID: 'query-param-test-id',
        content: req.content,
        filename: 'query-test.pdf',
        mimeType: 'application/pdf',
        url: 'promo/query-param-test-id#query-test.pdf'
      }],
      null,
      false
    )
  })

  test('should throw error when ID cannot be extracted', async () => {
    // Mock CQN without ID in where clause
    const malformedCqn = {
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

    cds.odata.parse.mockReturnValue(malformedCqn)

    const req = {
      content: {
        url: '/odata/v4/test/Entity/attachments/content'
      }
    }

    const mockAttachment = { name: 'TestAttachments' }
    const mockSrv = {}

    await expect(
      attachmentsService.nonDraftHandler(req, mockAttachment, mockSrv)
    ).rejects.toThrow('ID not found in request URL')
  })

  test('should throw error when attachment record is not found in database', async () => {
    const singleAttachmentCqn = {
      SELECT: {
        from: {
          ref: [
            {
              id: "test.Service.Entity",
              where: [
                { ref: ["ID"] },
                "=",
                { val: "non-existent-id" }
              ]
            },
            "attachments"
          ]
        }
      }
    }

    cds.odata.parse.mockReturnValue(singleAttachmentCqn)

    // Mock SELECT to return null (record not found)
    mockSelect.from.mockClear()
    const mockColumns = jest.fn().mockResolvedValue(null)
    mockSelect.from.mockReturnValue({ columns: mockColumns })

    const req = {
      content: {
        url: '/odata/v4/test/Entity(ID=non-existent-id)/attachments/content'
      }
    }

    const mockAttachment = { name: 'TestAttachments' }
    const mockSrv = {}

    await expect(
      attachmentsService.nonDraftHandler(req, mockAttachment, mockSrv)
    ).rejects.toThrow('Attachment with ID non-existent-id not found')
  })

  test('should not process non-content URLs', async () => {
    const putSpy = jest.spyOn(attachmentsService, 'put').mockResolvedValue([])

    const req = {
      content: {
        url: '/odata/v4/processor/Incidents(ID=123)/attachments'
      }
    }

    const mockAttachment = { name: 'TestAttachments' }
    const mockSrv = {}

    const result = await attachmentsService.nonDraftHandler(req, mockAttachment, mockSrv)

    expect(result).toBeUndefined()
    expect(putSpy).not.toHaveBeenCalled()
    expect(cds.odata.parse).not.toHaveBeenCalled()
  })
})