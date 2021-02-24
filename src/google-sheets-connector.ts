import {google as goog, Auth, drive_v3, sheets_v4} from 'googleapis'
import {info, error} from '@actions/core'
import {getSprint} from './report'
import {snakeCase} from 'lodash'

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

const _findReportFolder = async (folderName: string) => {
  const folderQuery = `mimeType='application/vnd.google-apps.folder' and name='${folderName}'`
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

const _shareAndMoveSheet = async (sheetId: string, folderId: string, shareWith: string) => {
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
  info(`Sheet was shared with user ${shareWith}`)
  const moveRes = await gdrive.files.update({
    fileId: sheetId,
    addParents: folderId,
    fields: `id, parents`,
  })
  info(`Sheet with id "${sheetId}" have moved to folder with id "${folderId}"`)
  return moveRes
}

const _populateReport = async (sheetId: string, payload: any) => {
  const sheetData = [] as any
  const reportHeader = [
    'Ticket Key',
    'Type',
    'Assignee',
    'Summary',
    'Status',
    'In Progress (minutes)',
    'In Review (minutes)',
    'In Testing (minutes)',
  ]
  const issues = payload.issues as any[]
  sheetData.push(reportHeader)
  if (issues && issues.length > 0) {
    issues.forEach((issue: any) => {
      const history = issue.history as any[]
      let inReview = '0',
        inProgress = '0',
        inTesting = '0'
      history.forEach((hist: any) => {
        const {from, to, diffInMin} = hist
        if (diffInMin && diffInMin !== '') {
          if (from === 'In Progress') {
            inProgress = diffInMin
          }
          if (from === 'In Review') {
            inReview = diffInMin
          }
          if (from === 'In Testing') {
            inTesting = diffInMin
          }
        }
      })
      sheetData.push([
        issue.key,
        issue.type,
        issue.assignee,
        issue.summary,
        issue.status,
        inProgress,
        inReview,
        inTesting,
      ])
    })
  }
  await gsheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          majorDimension: 'ROWS',
          range: 'Sheet1!A:H',
          values: sheetData,
        },
      ],
    },
  })

  const totalData = []
  totalData.push(['Total Stories', 'Total Tasks', 'Total Bugs', 'Total Sub-tasks'])
  totalData.push([payload.totalStories, payload.totalTasks, payload.totalBugs, payload.totalSubtasks])

  await gsheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          majorDimension: 'ROWS',
          range: `Sheet1!J:M`,
          values: totalData,
        },
      ],
    },
  })
}

const writeData = async (payload: any) => {
  // get sprint based on id
  const sprintInfo = await getSprint(sprintId)
  const {sprint, issues} = sprintInfo
  const reportName = `${sprint.id}_${snakeCase(sprint.name)}`
  const reportFolderName = `Ops_reporting`
  const reportAdminEmail = 'leo.jin@enterprisedb.com'
  try {
    const reportFolder = await _findReportFolder(reportFolderName)
    if (reportFolder) {
      const report = await _findReport(reportName)
      if (report) {
        // delete if found
        info(`report with name "${reportName}"  found, we delete and recreate`)
        await gdrive.files.delete({
          fileId: report.id as string,
        })
      }
      const spreadsheetId = (await _createReport(reportName)) as string
      await _shareAndMoveSheet(spreadsheetId, reportFolder.id as string, reportAdminEmail)
      await _populateReport(spreadsheetId, payload)
    } else {
      throw `Reporting folder with name "${reportFolderName}" was not found`
    }
  } catch (e) {
    error(e)
  }
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
