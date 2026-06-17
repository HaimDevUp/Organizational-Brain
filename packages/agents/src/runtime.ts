import { getPluginRunner } from "./plugins/registry";
import type { AgentPluginContext, AgentRunInput, AgentRunResult } from "./plugins/types";

export async function runAgent(
  ctx: AgentPluginContext,
  input: AgentRunInput
): Promise<AgentRunResult> {
  const runner = getPluginRunner(ctx.agentSlug);
  return runner.run(ctx, input);
}
