process.env.JIRA_API_TOKEN = 'test'
process.env.JIRA_BASE_URL = 'https://testjira.com'

import mockSprintPayload from './mocks/mock-sprint-payload.json'
import JiraClient from 'jira-client'
import {getAllIssuesForSprint} from '../src/report'

test(`report test`, () => {
  const mockFunction = jest.fn()
  mockFunction.mockReturnValueOnce(Promise.resolve(mockSprintPayload))
  JiraClient.prototype.searchJira = mockFunction
  getAllIssuesForSprint('test').then(data => {
    console.log(data)
  })
})
