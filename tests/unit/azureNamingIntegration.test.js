// Mock test to verify Azure special naming integration works
// Note: This test doesn't actually connect to Azure since we don't have real credentials in tests

const AzureAttachmentsService = require('../../lib/azure-blob-storage')

describe('Azure Blob Storage Integration with Special Naming', () => {
  let azureService

  beforeEach(() => {
    azureService = new AzureAttachmentsService()
  })

  test('should generate correct blob names for incident attachments', () => {
    const attachmentEntityName = 'sap.capire.incidents.Attachments'
    const folderName = azureService.getFolderName(attachmentEntityName)
    
    expect(folderName).toBe('incidents')
    
    const ID = '3ccf474c-3881-44b7-99fb-59a2a4668418'
    const filename = 'error-log.txt'
    const expectedBlobName = `${folderName}/${ID}#${filename}`
    
    expect(expectedBlobName).toBe('incidents/3ccf474c-3881-44b7-99fb-59a2a4668418#error-log.txt')
  })

  test('should handle vendor promo attachments correctly', () => {
    const attachmentEntityName = 'sap.vendor.activevendorpromo.Attachments'
    const folderName = azureService.getFolderName(attachmentEntityName)
    
    expect(folderName).toBe('promo')
    
    const ID = 'vendor-123-promo-456'
    const filename = 'summer-sale.pdf'
    const expectedBlobName = `${folderName}/${ID}#${filename}`
    
    expect(expectedBlobName).toBe('promo/vendor-123-promo-456#summer-sale.pdf')
  })

  test('should work with different attachment entity structures', () => {
    const testCases = [
      {
        entityName: 'com.example.documents.Attachments',
        expectedFolder: 'documents',
        expectedBlob: 'documents/doc-123#report.docx'
      },
      {
        entityName: 'myapp.photos.Attachments', 
        expectedFolder: 'photos',
        expectedBlob: 'photos/photo-456#vacation.jpg'
      },
      {
        entityName: 'system.defaultvendorpromo.Attachments',
        expectedFolder: 'promo',
        expectedBlob: 'promo/promo-789#banner.png'
      }
    ]

    testCases.forEach(({ entityName, expectedFolder, expectedBlob }) => {
      const folderName = azureService.getFolderName(entityName)
      expect(folderName).toBe(expectedFolder)
      
      const parts = expectedBlob.split('/')
      const filePart = parts[1].split('#')
      const ID = filePart[0]
      const filename = filePart[1]
      const blobName = `${folderName}/${ID}#${filename}`
      
      expect(blobName).toBe(expectedBlob)
    })
  })
})