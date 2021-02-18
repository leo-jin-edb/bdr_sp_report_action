process.env.JIRA_API_TOKEN = 'test'
process.env.JIRA_BASE_URL = 'https://testjira.com'

import mockSprintPayload from './mocks/mock-sprint-payload.json'
import JiraClient from 'jira-client'
import {getAllIssuesForSprint} from '../src/report'

test(`report test`, async () => {
  const mockFunction = jest.fn()
  mockFunction.mockReturnValueOnce(Promise.resolve(mockSprintPayload))
  JiraClient.prototype.searchJira = mockFunction
  const data = await getAllIssuesForSprint('test')
  expect(data?.total).toBeTruthy()
  expect(data?.totalSubtasks).toBeGreaterThan(0)
  expect(data?.issues.length).toBeGreaterThan(0)
  // console.log(JSON.stringify(data?.issues, null, 2))
  data?.issues.forEach((issue: any) => {
    expect(issue.key).toBeTruthy()
    expect(issue.type).toBeTruthy()
    expect(issue.status).toBeTruthy()
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
