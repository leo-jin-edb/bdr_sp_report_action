import JiraClient from 'jira-client'
import fs from 'fs'

let jiraApi: JiraClient

const getAllIssuesForSprint = async (sprintId: string) => {
  const jql = `project = 'BDR (Bi-directional replication)' AND Sprint = ${sprintId}`
  console.log('jql = ', jql)
  const response = await jiraApi.searchJira(jql, {
    fields: ['issuekey', 'issuetype', 'summary', 'status', 'assignee', 'created', 'sprint.name', 'sprint.id'],
    expand: ['changelog'],
  })

  fs.writeFileSync('/Users/leo.jin/jira_response.json', JSON.stringify(response))
  // console.log('hello = ', JSON.stringify(response))
  return response
}

const initialize = () => {
  const jiraApiToken = process.env['JIRA_API_TOKEN']
  const jiraApiInfo = process.env['JIRA_BASE_URL'] ? process.env['JIRA_BASE_URL'].split(':') : null
  console.log(jiraApiInfo)
  if (jiraApiInfo) {
    const jiraConfig = {
      protocol: jiraApiInfo[0],
      host: jiraApiInfo[1].substring(2),
      username: 'leo.jin@enterprisedb.com',
      password: jiraApiToken,
      apiVersion: 'latest',
      strictSSL: true,
    }
    jiraApi = new JiraClient(jiraConfig)
  } else {
    throw 'No Jira API token found, please set token in githhub secretes'
  }
}

initialize()

export {getAllIssuesForSprint}
