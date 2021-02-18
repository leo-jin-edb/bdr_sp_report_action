import JiraClient from 'jira-client'

let jiraApi: JiraClient

const getAllIssuesForSprint = async (sprintId: string) => {
  const jql = `project = 'BDR (Bi-directional replication)' AND Sprint = ${sprintId}`
  console.log('jql = ', jql)
  const response = await jiraApi.searchJira(jql, {
    fields: ['issuekey', 'summary', 'status', 'assignee', 'created', 'sprint.name', 'sprint.id'],
    expand: ['changelog'],
  })
  console.log('hello = ', response)
  return response
}

const initialize = () => {
  const jiraApiToken = process.env['JIRA_API_TOKEN']
  const jiraApiInfo = process.env['JIRA_BASE_URL'] ? process.env['JIRA_BASE_URL'].split(':') : null
  if (jiraApiInfo) {
    const jiraConfig = {
      protocol: jiraApiInfo[0],
      host: jiraApiInfo[1].substring(2),
      username: 'leo.jin@enterprisedb.com',
      password: '3dIgsWKrsojBYLizqg9u727E',
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
