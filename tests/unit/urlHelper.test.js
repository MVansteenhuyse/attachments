const { stripQueryParams } = require('../../lib/helper')

describe('URL Helper Functions', () => {
  describe('stripQueryParams', () => {
    test('should remove query parameters from URL ending with /content', () => {
      const urlWithParams = '/incidents/123/attachments/456/content?timestamp=1234567890'
      const result = stripQueryParams(urlWithParams)
      expect(result).toBe('/incidents/123/attachments/456/content')
    })

    test('should remove multiple query parameters', () => {
      const urlWithParams = '/incidents/123/attachments/456/content?timestamp=1234567890&version=2&format=json'
      const result = stripQueryParams(urlWithParams)
      expect(result).toBe('/incidents/123/attachments/456/content')
    })

    test('should return original URL if no query parameters exist', () => {
      const urlWithoutParams = '/incidents/123/attachments/456/content'
      const result = stripQueryParams(urlWithoutParams)
      expect(result).toBe('/incidents/123/attachments/456/content')
    })

    test('should handle URLs with only query separator', () => {
      const urlWithEmptyQuery = '/incidents/123/attachments/456/content?'
      const result = stripQueryParams(urlWithEmptyQuery)
      expect(result).toBe('/incidents/123/attachments/456/content')
    })

    test('should handle empty or null URLs', () => {
      expect(stripQueryParams('')).toBe('')
      expect(stripQueryParams(null)).toBe(null)
      expect(stripQueryParams(undefined)).toBe(undefined)
    })

    test('should handle URLs that do not end with /content', () => {
      const url = '/incidents/123/attachments/456?timestamp=1234567890'
      const result = stripQueryParams(url)
      expect(result).toBe('/incidents/123/attachments/456')
    })

    test('should handle complex URLs with fragments and query params', () => {
      const url = '/api/v1/incidents/123/attachments/456/content?timestamp=1234567890&format=json#section'
      const result = stripQueryParams(url)
      expect(result).toBe('/api/v1/incidents/123/attachments/456/content')
    })
  })
})