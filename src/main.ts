import * as core from '@actions/core'
import {wait} from './wait'
import {getAllIssuesForSprint} from './report'
import {writeFileSync} from 'fs'
import * as github from '@actions/github'

async function run(): Promise<void> {
  try {
    const {client_payload} = github.context.payload
    // const data = await getAllIssuesForSprint('1345')
    writeFileSync(
      '/Users/leo.jin/development/tools/reporting/bdr_sp_report_action/jira_response.json',
      JSON.stringify(client_payload, null, 2),
    )
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
