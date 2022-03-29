const core = require("@actions/core");
const github = require("@actions/github");
const { graphql } = require("@octokit/graphql");

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: core.getInput("access-token"),
  },
});

const issuesQuery = `query issues($projectId: ID!)
    {
      node(id: $projectId) {
        ... on ProjectNext {
          items(first: 10, after: null) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              title
              content {
                ... on Issue {
                  id
                  number
                  url
                  projectCards {
                    edges {
                      node {
                        id
                        column {
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

async function getIssues(projectId) {
  return graphqlWithAuth(issuesQuery, {
    projectId: core.getInput("project-to-add-to"),
  });
}

const addIssueToProject = await graphqlWithAuth(
  `mutation {
    addProjectNextItem(input: {projectId: "MDExOlByb2plY3ROZXh0MzQ5MA==" contentId: "I_kwDOBCvUzs5Fw8KB"}) {
      projectNextItem {
        id
      }
    }
  }
`
);

try {
  const run = async () => {
    try {
      console.log(core.getInput("project-to-add-to"));
      console.log(getIssues());
    } catch (error) {
      core.info(error);
    }
  };

  run();
} catch (error) {
  core.setFailed(error.message);
}
