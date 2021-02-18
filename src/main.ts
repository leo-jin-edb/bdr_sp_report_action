import * as core from '@actions/core'
import {wait} from './wait'
import {getAllIssuesForSprint} from './report'
import {writeFileSync} from 'fs'

async function run(): Promise<void> {
  try {
    const ms: string = core.getInput('milliseconds')
    core.debug(`Waiting ${ms} milliseconds ...`) // debug is only output if you set the secret `ACTIONS_RUNNER_DEBUG` to true

    console.log('am i hitting this waiting for ' + ms)
    core.info('jus testing info logging test changes!!! ok one shot update')
    core.debug(new Date().toTimeString())
    await wait(parseInt(ms, 10))
    core.debug(new Date().toTimeString())
    const data = await getAllIssuesForSprint('1345')
    // console.log('data = ', data)
    writeFileSync(
      '/Users/leo.jin/development/tools/reporting/bdr_sp_report_action/jira_response.json',
      JSON.stringify(data, null, 2),
    )

    core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
