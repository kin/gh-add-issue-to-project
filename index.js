const core = require("@actions/core");
const github = require("@actions/github");
const { graphql } = require("@octokit/graphql");

const run = async () => {
  const payload = github.context.payload;
  const pullRequest = payload.pull_request;
  const targetProjectId = core.getInput("target-project");
  const orgName = payload.organization.login;
  const repositoryName = payload.repository.name;
  const accessToken = core.getInput("access-token");

  console.log(payload);
  console.log(pullRequest.number, "pully number");
  console.log(orgName, "org name");
  console.log(repositoryName, "repo");
  getIssuesFromPullRequest(
    pullRequest.number,
    orgName,
    repositoryName,
    accessToken
  )
    .then((data) => {
      console.dir(data.repository.pullRequest.closingIssuesReferences);
      console.log(
        data.repository.pullRequest.closingIssuesReferences.nodes.length +
          " - this many nodes"
      );
      data.repository.pullRequest.closingIssuesReferences.nodes.map(({ id }) =>
        addIssuesToProject(targetProjectId, id)
      );
    })
    .catch((e) => {
      core.setFailed(e.message);
    });
};

async function addIssuesToProject(issueNodeIds, projectId) {
  issueNodeIds.map((nodeId) =>
    addIssueToProject(projectId, nodeId, core.getInput("access-token"))
  );
}

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
