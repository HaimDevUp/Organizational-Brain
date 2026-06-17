import { Octokit } from "@octokit/rest";

export type GitHubRepoConfig = {
  owner: string;
  repo: string;
  token: string;
};

export class GitHubGitClient {
  private octokit: Octokit;

  constructor(private config: GitHubRepoConfig) {
    this.octokit = new Octokit({ auth: config.token });
  }

  async createBranch(branchName: string, fromRef = "main"): Promise<void> {
    const { owner, repo } = this.config;
    const ref = await this.octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${fromRef}`,
    });
    await this.octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: ref.data.object.sha,
    });
  }

  async upsertFile(
    branch: string,
    path: string,
    content: string,
    message: string
  ): Promise<{ sha: string }> {
    const { owner, repo } = this.config;
    let sha: string | undefined;
    try {
      const existing = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });
      if (!Array.isArray(existing.data) && "sha" in existing.data) {
        sha = existing.data.sha;
      }
    } catch {
      // file does not exist
    }

    const result = await this.octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch,
      sha,
    });

    return { sha: result.data.commit.sha ?? "" };
  }

  async createPullRequest(params: {
    title: string;
    body?: string;
    head: string;
    base?: string;
  }): Promise<{ number: number; url: string }> {
    const { owner, repo } = this.config;
    const pr = await this.octokit.pulls.create({
      owner,
      repo,
      title: params.title,
      body: params.body,
      head: params.head,
      base: params.base ?? "main",
    });
    return { number: pr.data.number, url: pr.data.html_url };
  }

  async mergePullRequest(
    pullNumber: number,
    mergeMethod: "merge" | "squash" | "rebase" = "merge"
  ): Promise<{ sha: string }> {
    const { owner, repo } = this.config;
    const result = await this.octokit.pulls.merge({
      owner,
      repo,
      pull_number: pullNumber,
      merge_method: mergeMethod,
    });
    return { sha: result.data.sha ?? "" };
  }

  async closePullRequest(pullNumber: number): Promise<void> {
    const { owner, repo } = this.config;
    await this.octokit.pulls.update({
      owner,
      repo,
      pull_number: pullNumber,
      state: "closed",
    });
  }

  async getFileContent(path: string, ref = "main"): Promise<string | null> {
    const { owner, repo } = this.config;
    try {
      const res = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });
      if (Array.isArray(res.data) || res.data.type !== "file") return null;
      if ("content" in res.data && res.data.content) {
        return Buffer.from(res.data.content, "base64").toString("utf8");
      }
      return null;
    } catch {
      return null;
    }
  }
}

export function createGitHubClient(config: GitHubRepoConfig): GitHubGitClient {
  return new GitHubGitClient(config);
}
