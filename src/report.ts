import JiraClient from 'jira-client'
import {flattenDeep, reverse} from 'lodash'
import {differenceInSeconds} from 'date-fns'
import {error} from '@actions/core'

let jiraApi: JiraClient
const boardId = '316'

const _transformHistory = (histories: any[]) => {
  const history = reverse(
    flattenDeep(
      histories.map((hist: any) => {
        return hist.items
          .filter((item: any) => {
            return item.field === 'status'
          })
          .map((item: any) => {
            return {
              created: hist.created,
              from: item.fromString,
              to: item.toString,
              fromId: item.from,
              toId: item.to,
            }
          })
      }),
    ),
  )
  for (let i = 0; i < history.length; i++) {
    const lastIndex = i - 1
    if (lastIndex >= 0) {
      const lastHist = history[lastIndex] as any
      const currentHist = history[i] as any
      const lastCreated = new Date(lastHist.created)
      const currentCreated = new Date(currentHist.created)
      const diffInSec = differenceInSeconds(currentCreated, lastCreated)
      currentHist.diffInMin = (diffInSec / 60).toFixed(2)
      currentHist.diffInSec = diffInSec.toFixed(2)
      currentHist.diffInHour = (diffInSec / 60 / 60).toFixed(2)
    }
  }
  return history
}

const _calculateTotals = (issues: any[]) => {
  const calculate = (type: string) => {
    return issues.reduce((aggr: number, issue: any) => {
      if (issue.type === type) {
        aggr++
      }
      return aggr
    }, 0)
  }
  const totalSubtasks = calculate('Sub-task')
  const totalBugs = calculate('Bug')
  const totalStories = calculate('Story')
  const totalTasks = calculate('Task')
  return {
    totalStories,
    totalTasks,
    totalBugs,
    totalSubtasks,
  }
}

const _processSprintReport = async (sprintId: string) => {
  const payload = await jiraApi.getSprintIssues(boardId, sprintId)
  const {completedIssues, puntedIssues, issuesCompletedInAnotherSprint, issueKeysAddedDuringSprint} = payload.contents
  const issuesCompletedInSprint = completedIssues.reduce((aggr: any, element: any) => {
    aggr[element.key] = element
    return aggr
  }, {})

  Object.keys(issuesCompletedInSprint).forEach((key: string) => {
    const v = issuesCompletedInSprint[key]
    const addedDuringSprint = issueKeysAddedDuringSprint[key]
    if (addedDuringSprint) {
      issuesCompletedInSprint[key].addedDuringSprint = addedDuringSprint
    } else {
      issuesCompletedInSprint[key].addedDuringSprint = false
    }
  })

  return {
    issuesCompletedInSprint: completedIssues.reduce((aggr: any, element: any) => {
      aggr[element.key] = element
      return aggr
    }, {}),
    issuesMovedFromSprint: puntedIssues.reduce((aggr: any, element: any) => {
      aggr[element.key] = element
      return aggr
    }, {}),
    issuesCompletedInAnotherSprint: issuesCompletedInAnotherSprint.reduce((aggr: any, element: any) => {
      aggr[element.key] = element
      return aggr
    }, {}),
    sprintInfo: payload.sprint,
  }
}

const getAllIssuesForSprint = async (sprintId: string) => {
  try {
    // get sprint report
    const report = await _processSprintReport(sprintId)
    const jql = `project = 'BDR (Bi-directional replication)' AND Sprint = ${sprintId}`
    const response = await jiraApi.searchJira(jql, {
      fields: ['issuekey', 'issuetype', 'summary', 'status', 'assignee', 'created', 'sprint.name', 'sprint.id'],
      expand: ['changelog'],
    })
    const {total, issues} = response
    const {issuesCompletedInSprint, issuesMovedFromSprint, sprintInfo} = report

    const issuesLite = issues.map((issue: any) => {
      const {id, key, fields, changelog} = issue
      const reportRecord = issuesCompletedInSprint[key]
      let addedDuringSprint = false
      if (reportRecord) {
        const {addedDuringSprint: ads} = reportRecord
        addedDuringSprint = ads
      } 
      const {summary, issuetype, assignee, status, created} = fields
      const {histories} = changelog
      const history = _transformHistory(histories)
      return {
        id,
        key,
        type: issuetype.name,
        addedDuringSprint,
        summary,
        assignee: assignee ? assignee.emailAddress : null,
        status: status.name,
        created,
        history,
      }
    })
    const moreTotals = _calculateTotals(issuesLite)
    return {
      total,
      ...moreTotals,
      issues: issuesLite,
      issuesMovedFromSprint: Object.keys(issuesMovedFromSprint),
      sprintInfo,
    }
  } catch (e) {
    error(e)
  }
}

const getSprint = async (sprintId: string) => {
  const listSprints = await jiraApi.listSprints(boardId)
  const {sprints} = listSprints
  const sprint = sprints.find((sp: any) => sp.id.toString() === sprintId)
  if (sprint) {
    const issues = await getAllIssuesForSprint(sprint.id)
    return {
      sprint,
      issues,
    }
  } else {
    throw `sprint with id "${sprintId}" is not found`
  }
}

const getActiveSprints = async () => {
  const board = await jiraApi.getBoard(boardId)
  // TODO: need to find a better way to get the last sprint
  const sprints = await jiraApi.getAllSprints(boardId, undefined, undefined, 'active')
  return sprints.values
}

const _initialize = () => {
  const jiraApiToken = process.env['JIRA_API_TOKEN']
  const jiraApiInfo = process.env['JIRA_BASE_URL'] ? process.env['JIRA_BASE_URL'].split(':') : null
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

_initialize()

export {getAllIssuesForSprint, getActiveSprints, getSprint}
