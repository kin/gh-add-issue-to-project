const core = require("@actions/core");
const github = require("@actions/github");
const { graphql } = require("@octokit/graphql");

const run = async () => {
  try {
    const targetProjectId = core.getInput("target-project");
    const accessToken = core.getInput("access-token");

    const payload = github.context.payload;
    const pullRequest = payload.pull_request;
    const orgName = payload.organization.login;
    const repositoryName = payload.repository.name;

    const data = await getIssuesFromPullRequest(
      pullRequest.number,
      orgName,
      repositoryName,
      accessToken
    );
    const issueNodes =
      data.repository.pullRequest.closingIssuesReferences.nodes;
    if (issueNodes.length <= 0) {
      core.info(
        "No linked issues. Pull Request needs issue number with closing keyword in description. For example: Resolves #1234"
      );
    } else {
      await Promise.all(
        data.repository.pullRequest.closingIssuesReferences.nodes.map(
          ({ id }) => addIssueToProject(targetProjectId, id, accessToken)
        )
      );
      core.info(
        `Pull request issues have been added to the '${targetProjectId}' board.`
      );
    }
  } catch (e) {
    console.log("payload info")
    console.log(github.context.payload)
    console.log(e);
    core.setFailed(e.message);
  }
};

// Requests

async function addIssueToProject(projectId, contentId, accessToken) {
  return graphql(addIssueToProjectMutation, {
    projectId: projectId,
    contentId: contentId,
    headers: {
      authorization: `bearer ${accessToken}`,
    },
  });
}

async function getIssuesFromPullRequest(
  pullRequestNumber,
  owner,
  repository,
  accessToken
) {
  return graphql(getResolvingIssueQuery, {
    owner: owner,
    repository: repository,
    number: pullRequestNumber,
    headers: {
      authorization: `bearer ${accessToken}`,
    },
  });
}

// Queries & Mutations

const getResolvingIssueQuery = `
  query GetResolvingIssue($owner: String!, $repository: String!, $number: Int!) {
    repository(owner:$owner, name:$repository) {
      pullRequest(number: $number) {
        id
        title
        closingIssuesReferences(last: 10) {
          nodes {
            id
          }
        }
      }
    }
  }
`;

const addIssueToProjectMutation = `
  mutation AddIssueToProject($projectId: ID!, $contentId: ID!) {
    addProjectNextItem(input: {projectId: $projectId, contentId: $contentId}) {
      projectNextItem {
        id
      }
    }
  }
`;

run();
