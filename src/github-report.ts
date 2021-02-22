import {Octokit} from '@octokit/rest'

let octokit: Octokit

const initialize = () => {
  const accessToken = process.env['GITHUB_ACCESSTOKEN']
  octokit = new Octokit({
    auth: accessToken,
  })
}

/**
 * TODO: figure out a good way to detect post merge test failures
 */
const getPullRequestInfo = async () => {
  const res = await octokit.search.issuesAndPullRequests({
    q: `repo:EnterpriseDB/bdr is:pr is:closed closed:2021-02-01..2021-02-14`
  })
}

initialize()

export {
  getPullRequestInfo
}