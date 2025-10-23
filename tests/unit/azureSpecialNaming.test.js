const AzureAttachmentsService = require('../../lib/azure-blob-storage')

describe('Azure Blob Storage Special Naming', () => {
  let azureService

  beforeEach(() => {
    azureService = new AzureAttachmentsService()
  })

  describe('getFolderName', () => {
    test('should extract folder name from entity name', () => {
      const entityName = 'com.example.incidents.Attachments'
      const result = azureService.getFolderName(entityName)
      expect(result).toBe('incidents')
    })

    test('should handle single level entity names', () => {
      const entityName = 'Attachments'
      const result = azureService.getFolderName(entityName)
      expect(result).toBe('attachments')
    })

    test('should map activevendorpromo to promo', () => {
      const entityName = 'com.example.activevendorpromo.Attachments'
      const result = azureService.getFolderName(entityName)
      expect(result).toBe('promo')
    })

    test('should map defaultvendorpromo to promo', () => {
      const entityName = 'com.example.defaultvendorpromo.Attachments'
      const result = azureService.getFolderName(entityName)
      expect(result).toBe('promo')
    })

    test('should handle complex nested entity names', () => {
      const entityName = 'sap.capire.incidents.conversation.Attachments'
      const result = azureService.getFolderName(entityName)
      expect(result).toBe('conversation')
    })

    test('should convert to lowercase', () => {
      const entityName = 'com.example.INCIDENTS.Attachments'
      const result = azureService.getFolderName(entityName)
      expect(result).toBe('incidents')
    })
  })

  describe('blob naming format', () => {
    test('should generate correct blob name format', () => {
      const folderName = 'incidents'
      const ID = '123e4567-e89b-12d3-a456-426614174000'
      const filename = 'document.pdf'
      const expectedBlobName = `${folderName}/${ID}#${filename}`
      
      expect(expectedBlobName).toBe('incidents/123e4567-e89b-12d3-a456-426614174000#document.pdf')
    })

    test('should handle special characters in filename', () => {
      const folderName = 'documents'
      const ID = '123e4567-e89b-12d3-a456-426614174000'
      const filename = 'my document (1).pdf'
      const expectedBlobName = `${folderName}/${ID}#${filename}`
      
      expect(expectedBlobName).toBe('documents/123e4567-e89b-12d3-a456-426614174000#my document (1).pdf')
    })

    test('should handle promo folder mapping', () => {
      const folderName = azureService.getFolderName('com.vendor.activevendorpromo.Attachments')
      const ID = '123e4567-e89b-12d3-a456-426614174000'
      const filename = 'promo-image.jpg'
      const expectedBlobName = `${folderName}/${ID}#${filename}`
      
      expect(expectedBlobName).toBe('promo/123e4567-e89b-12d3-a456-426614174000#promo-image.jpg')
    })
  })
})