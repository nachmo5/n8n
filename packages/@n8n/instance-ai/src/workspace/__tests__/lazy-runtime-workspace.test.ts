import {
	Workspace,
	type CommandResult,
	type WorkspaceFilesystem,
	type WorkspaceSandbox,
} from '@n8n/agents';

import { createLazyRuntimeWorkspace } from '../lazy-runtime-workspace';

function createMockWorkspace() {
	const executeCommand = jest.fn<
		Promise<CommandResult>,
		Parameters<NonNullable<WorkspaceSandbox['executeCommand']>>
	>(
		async (_command, _args, options) =>
			await Promise.resolve({
				success: true,
				exitCode: 0,
				stdout: options?.env?.N8N_SKILLS_DIR ?? '',
				stderr: '',
				executionTimeMs: 1,
			}),
	);
	const filesystem: WorkspaceFilesystem = {
		id: 'fs',
		name: 'Filesystem',
		provider: 'test',
		status: 'ready',
		readFile: jest.fn(async () => await Promise.resolve('hello')),
		writeFile: jest.fn(async () => await Promise.resolve()),
		appendFile: jest.fn(async () => await Promise.resolve()),
		deleteFile: jest.fn(async () => await Promise.resolve()),
		copyFile: jest.fn(async () => await Promise.resolve()),
		moveFile: jest.fn(async () => await Promise.resolve()),
		mkdir: jest.fn(async () => await Promise.resolve()),
		rmdir: jest.fn(async () => await Promise.resolve()),
		readdir: jest.fn(async () => await Promise.resolve([])),
		exists: jest.fn(async () => await Promise.resolve(true)),
		stat: jest.fn(
			async (path: string) =>
				await Promise.resolve({
					name: path,
					path,
					type: 'file' as const,
					size: 5,
					createdAt: new Date('2026-01-01T00:00:00.000Z'),
					modifiedAt: new Date('2026-01-01T00:00:00.000Z'),
				}),
		),
	};
	const sandbox: WorkspaceSandbox = {
		id: 'sandbox',
		name: 'Sandbox',
		provider: 'test',
		status: 'running',
		getDefaultCommandEnv: jest.fn(() => ({ N8N_SKILLS_DIR: '/workspace/skills' })),
		executeCommand,
	};

	return {
		workspace: new Workspace({ filesystem, sandbox }),
		filesystem,
		sandbox,
		executeCommand,
	};
}

describe('createLazyRuntimeWorkspace', () => {
	it('advertises workspace tools without creating the real workspace', async () => {
		const { workspace } = createMockWorkspace();
		const ensureWorkspace = jest.fn(async () => await Promise.resolve(workspace));
		const lazyWorkspace = createLazyRuntimeWorkspace({ ensureWorkspace });

		const tools = lazyWorkspace.getTools();
		lazyWorkspace.getInstructions();

		expect(ensureWorkspace).not.toHaveBeenCalled();
		expect(tools.some((tool) => tool.name === 'workspace_read_file')).toBe(true);
		expect(tools.some((tool) => tool.name === 'workspace_execute_command')).toBe(true);

		const readFile = tools.find((tool) => tool.name === 'workspace_read_file');
		await readFile?.handler?.({ path: '/workspace/report.md' }, {});

		expect(ensureWorkspace).toHaveBeenCalledTimes(1);
	});

	it('merges sandbox default env after the real workspace is created', async () => {
		const { workspace, executeCommand } = createMockWorkspace();
		const ensureWorkspace = jest.fn(async () => await Promise.resolve(workspace));
		const lazyWorkspace = createLazyRuntimeWorkspace({ ensureWorkspace });
		const executeCommandTool = lazyWorkspace
			.getTools()
			.find((tool) => tool.name === 'workspace_execute_command');

		const result = await executeCommandTool?.handler?.({ command: 'echo $N8N_SKILLS_DIR' }, {});

		expect(result).toMatchObject({ stdout: '/workspace/skills' });
		expect(executeCommand.mock.calls[0]?.[0]).toBe('echo $N8N_SKILLS_DIR');
		expect(executeCommand.mock.calls[0]?.[1]).toEqual([]);
		expect(executeCommand.mock.calls[0]?.[2]?.env).toMatchObject({
			N8N_SKILLS_DIR: '/workspace/skills',
		});
	});
});
