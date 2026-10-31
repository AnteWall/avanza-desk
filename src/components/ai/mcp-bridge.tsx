import { useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

import { compact, tools } from "@/lib/ai/tools";
import { errorMessage } from "@/lib/avanza/error-message";

type McpCall = { id: string; name: string; args: Record<string, unknown> };

/**
 * Serves the AI tools to the app's MCP server (src-tauri/src/ai/mcp.rs): registers them and
 * answers each call. Mount only with a confirmed Avanza session.
 */
export function McpBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const definitions = tools.map(({ name, description, inputSchema }) => ({
      name,
      description,
      inputSchema,
      annotations: { readOnlyHint: true },
    }));
    void invoke("mcp_register", { tools: definitions });
    const unlisten = listen<McpCall>("mcp-call", async ({ payload: { id, name, args } }) => {
      const tool = tools.find((t) => t.name === name);
      try {
        if (!tool) throw new Error(`Unknown tool ${name}`);
        const content = compact(await tool.run(queryClient, args));
        await invoke("mcp_result", { id, ok: true, content });
      } catch (error) {
        await invoke("mcp_result", { id, ok: false, content: errorMessage(error) });
      }
    });
    return () => void unlisten.then((stop) => stop());
  }, [queryClient]);

  return null;
}
