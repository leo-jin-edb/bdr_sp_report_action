import * as core from '@actions/core'
import {getAllIssuesForSprint} from './report'
import * as github from '@actions/github'
import {writeData} from './google-sheets-connector'
import {info} from '@actions/core'

async function run(): Promise<void> {
  try {
    const {client_payload} = github.context.payload
    const {sprintId} = client_payload
    info(`kick off report generation for sprint "${sprintId}"`)
    const sprintData = await getAllIssuesForSprint(sprintId)
    await writeData(sprintData)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
