import {google as goog, Auth, drive_v3, sheets_v4} from 'googleapis'
import {info, error} from '@actions/core'
import {getSprint} from './report'
import {snakeCase} from 'lodash'
import {sheets} from 'googleapis/build/src/apis/sheets'

let jwtClient: Auth.JWT
let gdrive: drive_v3.Drive
let gsheets: sheets_v4.Sheets
let sprintId = '1345'

const _createReport = async (reportName: string) => {
  const createReportResource = {
    properties: {
      title: reportName,
      locale: 'en',
      timeZone: 'UTC',
    },
  }
  const createReportRequest = {
    resource: createReportResource,
    fields: 'spreadsheetId',
  }
  const reportCreateRes = await gsheets.spreadsheets.create(createReportRequest)
  const {spreadsheetId} = reportCreateRes.data
  info(`Sheet "${reportName}" was created with id "${spreadsheetId}"`)
  return spreadsheetId
}

const _findReportFolder = async () => {
  const folderQuery = `mimeType='application/vnd.google-apps.folder' and name='Ops_reporting'`
  const folderRes = await gdrive.files.list({
    q: folderQuery,
  })
  const folders = folderRes.data.files
  if (folders && folders.length > 0) {
    return folders[0]
  }
  return undefined
}

const _findReport = async (reportName: string) => {
  const reportQuery = `name = '${reportName}'`
  const reportRes = await gdrive.files.list({
    q: reportQuery,
  })
  const files = reportRes.data.files
  if (files && files.length === 1) {
    return files[0]
  }
  return undefined
}

const _shareAndMoveSheet = async (sheetId: string, reportId: string, shareWith: string) => {
  const drivePermissionResource = {
    resource: {
      type: 'user',
      role: 'writer',
      emailAddress: shareWith, // 'leo.jin@enterprisedb.com', // Please set the email address you want to give the permission.
    },
    fileId: sheetId,
    fields: 'id',
  }
  await gdrive.permissions.create(drivePermissionResource)
  return await gdrive.files.update({
    fileId: sheetId,
    addParents: reportId,
    fields: `id, parents`,
  })
}

const writeData = async (payload: any) => {
  console.log('write data called')
  // get sprint based on id
  const sprintInfo = await getSprint(sprintId)
  const {sprint, issues} = sprintInfo
  const reportName = `${sprint.id}_${snakeCase(sprint.name)}`
  console.log('report name = ', reportName)
  try {
    const reportFolder = await _findReportFolder()
    if (reportFolder) {
      console.log(reportFolder)
      const report = await _findReport(reportName)
      if (report) {
        // delete if found
        info(`report with name "${reportName}"  found, we delete and recreate`)
        await gdrive.files.delete({
          fileId: report.id as string,
        })
      }
      const spreadsheetId = (await _createReport(reportName)) as string
      await _shareAndMoveSheet(spreadsheetId, reportFolder.id as string, 'leo.jin@enterprisedb.com')
    }
  } catch (e) {}
}

const initialize = () => {
  const sa_email = process.env.GOOG_SA_EMAIL
  const sa_key = process.env.GOOG_SA_KEY
  const scope = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
  jwtClient = new goog.auth.JWT(sa_email, undefined, sa_key, scope)
  jwtClient.authorize(function (err, tokens) {
    if (err) {
      error(err)
      return
    } else {
      info('Google Authenticated!')
      gdrive = goog.drive({version: 'v3', auth: jwtClient})
      gsheets = goog.sheets({version: 'v4', auth: jwtClient})
    }
  })
}

initialize()

export {writeData}
