const path = require("path")
const fs = require("fs")
const cds = require("@sap/cds")
const { test } = cds.test()
const {
  commentAnnotation,
  uncommentAnnotation,
} = require("../utils/modify-annotation")
const { delay } = require("../utils/testUtils")

const servicesCdsPath = path.resolve(
  __dirname,
  "../incidents-app/srv/services.cds"
)
const annotationsCdsPath = path.resolve(
  __dirname,
  "../incidents-app/app/incidents/annotations.cds"
)
const linesToComment = [
  "annotate ProcessorService.Incidents with @odata.draft.enabled",
  "annotate service.Incidents with @odata.draft.enabled",
]

beforeAll(async () => {
  await commentAnnotation(servicesCdsPath, linesToComment)
  await commentAnnotation(annotationsCdsPath, linesToComment)
})

const app = path.resolve(__dirname, "../incidents-app")
const { expect, axios } = require("@cap-js/cds-test")(app)

let incidentID = "3ccf474c-3881-44b7-99fb-59a2a4668418"

afterAll(async () => {
  try {
    await uncommentAnnotation(servicesCdsPath, linesToComment)
    await uncommentAnnotation(annotationsCdsPath, linesToComment)

    // Close any remaining CDS connections
    cds.disconnect()
  } catch (error) {
    console.warn("Warning: Error during cleanup:", error.message)
  }
})

describe("Tests for uploading/deleting and fetching attachments through API calls with non draft mode", () => {
  axios.defaults.auth = { username: "alice" }
  const { createAttachmentMetadata, uploadAttachmentContent } =
    createHelpers(axios)

  beforeAll(async () => {
    cds.env.requires.db.kind = "sql"
    cds.env.requires.attachments.kind = "db"
    await cds.connect.to("sql:my.db")
    await cds.connect.to("attachments")
    cds.env.requires.attachments.scan = false
    cds.env.profiles = ["development"]
  })

  beforeEach(async () => {
    // Clean up any existing attachments before each test
    await test.data.reset()
  })

  it("should create attachment metadata", async () => {
    const attachmentID = await createAttachmentMetadata(incidentID)
    expect(attachmentID).to.exist
  })

  it("should upload attachment content", async () => {
    const attachmentID = await createAttachmentMetadata(incidentID)
    const response = await uploadAttachmentContent(incidentID, attachmentID)
    expect(response.status).to.equal(204)
  })

  it("should upload attachment content with timestamp query parameter", async () => {
    const attachmentID = await createAttachmentMetadata(incidentID)
    
    // Upload content using URL with query parameters (simulating timestamp)
    const contentPath = "content/sample.pdf"
    const fileContent = fs.readFileSync(
      path.join(__dirname, "..", "integration", contentPath)
    )
    
    // Add timestamp query parameter to the URL
    const timestamp = Date.now()
    const response = await axios.put(
      `/odata/v4/processor/Incidents(${incidentID})/attachments(up__ID=${incidentID},ID=${attachmentID})/content?timestamp=${timestamp}&version=1`,
      fileContent,
      {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Length": fileContent.length,
        },
      }
    )
    
    expect(response.status).to.equal(204)
    
    // Verify the content was actually uploaded by fetching it
    const fetchResponse = await axios.get(
      `/odata/v4/processor/Incidents(${incidentID})/attachments(up__ID=${incidentID},ID=${attachmentID})/content`,
      { responseType: 'arraybuffer' }
    )
    expect(fetchResponse.status).to.equal(200)
    expect(fetchResponse.data).to.exist
    expect(fetchResponse.data.byteLength).to.be.greaterThan(0)
  })

  it("should handle content upload with metadata fetching from database", async () => {
    // Create attachment metadata first
    const attachmentID = await createAttachmentMetadata(incidentID, "test-metadata.pdf")
    
    // Upload content - this will trigger the nonDraftHandler which should fetch metadata from DB
    const contentPath = "content/sample.pdf"
    const fileContent = fs.readFileSync(
      path.join(__dirname, "..", "integration", contentPath)
    )
    
    const response = await axios.put(
      `/odata/v4/processor/Incidents(${incidentID})/attachments(up__ID=${incidentID},ID=${attachmentID})/content`,
      fileContent,
      {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Length": fileContent.length,
        },
      }
    )
    
    expect(response.status).to.equal(204)
    
    // Wait for processing to complete
    await delay()
    
    // Verify that the attachment metadata is still intact (filename should be preserved)
    const metadataResponse = await axios.get(
      `/odata/v4/processor/Incidents(${incidentID})/attachments(up__ID=${incidentID},ID=${attachmentID})`
    )
    
    expect(metadataResponse.status).to.equal(200)
    expect(metadataResponse.data.filename).to.equal("test-metadata.pdf")
    expect(metadataResponse.data.ID).to.equal(attachmentID)
    
    // Verify the content can be fetched
    const contentResponse = await axios.get(
      `/odata/v4/processor/Incidents(${incidentID})/attachments(up__ID=${incidentID},ID=${attachmentID})/content`,
      { responseType: 'arraybuffer' }
    )
    
    expect(contentResponse.status).to.equal(200)
    expect(contentResponse.data.byteLength).to.be.greaterThan(0)
  })

  it("should list attachments for incident", async () => {
    const attachmentID = await createAttachmentMetadata(incidentID)
    await uploadAttachmentContent(incidentID, attachmentID)

    // Wait for scanning to complete
    await delay()

    const response = await axios.get(
      `/odata/v4/processor/Incidents(ID=${incidentID})/attachments`
    )
    expect(response.status).to.equal(200)

    const expectedFilename = "sample.pdf"
    const expectedStatus = "Clean"
    const attachment = response.data.value[0]
    
    expect(attachment.up__ID).to.equal(incidentID)
    expect(attachment.filename).to.equal(expectedFilename)
    expect(attachment.status).to.equal(expectedStatus)
    expect(attachment.content).to.be.undefined
    expect(response.data.value[0].ID).to.equal(attachmentID)
  })

  it("Fetching the content of the uploaded attachment", async () => {
    const attachmentID = await createAttachmentMetadata(incidentID)
    await uploadAttachmentContent(incidentID, attachmentID)

    // Wait for scanning to complete
    await delay()

    const response = await axios.get(
      `/odata/v4/processor/Incidents(ID=${incidentID})/attachments(up__ID=${incidentID},ID=${attachmentID})/content`,
      { responseType: "arraybuffer" }
    )
    expect(response.status).to.equal(200)
    expect(response.data).to.exist
    expect(response.data.length).to.be.greaterThan(0)

    const originalContent = fs.readFileSync(
      path.join(__dirname, "content/sample.pdf")
    )
    expect(Buffer.compare(response.data, originalContent)).to.equal(0)
  })

  it("should delete attachment and verify deletion", async () => {
    const attachmentID = await createAttachmentMetadata(incidentID)
    await uploadAttachmentContent(incidentID, attachmentID)

    // Wait for scanning to complete
    await delay()

    // Delete the attachment
    const deleteResponse = await axios.delete(
      `/odata/v4/processor/Incidents(ID=${incidentID})/attachments(up__ID=${incidentID},ID=${attachmentID})`
    )
    expect(deleteResponse.status).to.equal(204)

    // Verify the attachment is deleted
    try {
      await axios.get(
        `/odata/v4/processor/Incidents(ID=${incidentID})/attachments(up__ID=${incidentID},ID=${attachmentID})`
      )
      // Should not reach here
      expect.fail("Expected 404 error")
    } catch (err) {
      expect(err.response.status).to.equal(404)
    }
  })
})

function createHelpers(axios) {
  return {
    createAttachmentMetadata: async (incidentID, filename = "sample.pdf") => {
      const response = await axios.post(
        `/odata/v4/processor/Incidents(${incidentID})/attachments`,
        { filename: filename },
        { headers: { "Content-Type": "application/json" } }
      )
      return response.data.ID
    },
    uploadAttachmentContent: async (
      incidentID,
      attachmentID,
      contentPath = "content/sample.pdf"
    ) => {
      const fileContent = fs.readFileSync(
        path.join(__dirname, "..", "integration", contentPath)
      )
      const response = await axios.put(
        `/odata/v4/processor/Incidents(${incidentID})/attachments(up__ID=${incidentID},ID=${attachmentID})/content`,
        fileContent,
        {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Length": fileContent.length,
          },
        }
      )
      return response
    },
  }
}
