process.env.JIRA_API_TOKEN = 'test'
process.env.JIRA_BASE_URL = 'https://testjira.com'

import mockSprintPayload from './mocks/mock-sprint-payload.json'
import JiraClient from 'jira-client'
import { getAllIssuesForSprint } from '../src/report'
import mockSprintReportPayload from './mocks/mock-sprint-report-payload.json'

test(`report test`, async () => {
  const mockFunction = jest.fn()
  mockFunction.mockReturnValueOnce(Promise.resolve(mockSprintPayload))
  const mockSprintReportFunction = jest.fn()
  mockSprintReportFunction.mockReturnValueOnce(Promise.resolve(mockSprintReportPayload))
  JiraClient.prototype.searchJira = mockFunction
  JiraClient.prototype.getSprintIssues = mockSprintReportFunction
  const data = await getAllIssuesForSprint('test')
  // console.log(data)
  expect(data?.total).toBeTruthy()
  expect(data?.totalSubtasks).toBeGreaterThan(0)
  expect(data?.totalStories).toEqual(0)
  expect(data?.totalTasks).toBeGreaterThan(0)
  expect(data?.totalBugs).toBeGreaterThan(0)
  expect(data?.issues.length).toBeGreaterThan(0)
  // console.log(JSON.stringify(data?.issues, null, 2))
  data?.issues.forEach((issue: any) => {
    expect(issue.key).toBeTruthy()
    expect(issue.type).toBeTruthy()
    expect(issue.status).toBeTruthy()
    expect(issue.addedDuringSprint).toBeDefined()
    expect(issue.history.length).toBeGreaterThan(0)
    let counter = 0
    issue.history.forEach((hist: any) => {
      expect(hist.fromId).toBeTruthy()
      expect(hist.from).toBeTruthy()
      expect(hist.to).toBeTruthy()
      expect(hist.toId).toBeTruthy()
      if (counter > 0) {
        expect(hist.diffInHour).toBeTruthy()
        expect(hist.diffInMin).toBeTruthy()
        expect(hist.diffInSec).toBeTruthy()
      }
      counter ++
    })
  })
})
