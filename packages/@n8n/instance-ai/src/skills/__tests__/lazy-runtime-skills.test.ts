import type { RuntimeSkillSource } from '@n8n/agents';

import { createLazyRuntimeSkillSource } from '../lazy-runtime-skills';

function createRuntimeSkillSource(instructions: string): RuntimeSkillSource {
	return {
		registry: {
			schemaVersion: 1,
			skillsHash: 'hash',
			skills: [
				{
					id: 'workflow-auditor',
					name: 'workflow-auditor',
					description: 'Audits workflows',
					hash: 'skill-hash',
					path: '/host/skills/workflow-auditor/SKILL.md',
					sourcePath: '/host/skills/workflow-auditor/SKILL.md',
					directory: '/host/skills/workflow-auditor',
					sourceDirectory: 'workflow-auditor',
					linkedFiles: {
						references: [],
						templates: [],
						scripts: [{ path: 'scripts/audit.ts', bytes: 10, sha256: 'sha' }],
						assets: [],
						examples: [],
						other: [],
					},
				},
			],
		},
		loadSkill: jest.fn(
			async () =>
				await Promise.resolve({
					id: 'workflow-auditor',
					name: 'workflow-auditor',
					description: 'Audits workflows',
					instructions,
				}),
		),
		loadFile: jest.fn(
			async (_skillId, filePath) =>
				await Promise.resolve({
					skillId: 'workflow-auditor',
					filePath,
					content: `file:${filePath}`,
				}),
		),
	};
}

describe('createLazyRuntimeSkillSource', () => {
	it('hides backing file paths from the visible registry', () => {
		const lazySource = createLazyRuntimeSkillSource({
			source: createRuntimeSkillSource('base'),
			resolveSource: jest.fn(),
		});

		expect(lazySource.registry.skills[0]).not.toHaveProperty('path');
		expect(lazySource.registry.skills[0]).not.toHaveProperty('sourcePath');
		expect(lazySource.registry.skills[0]).not.toHaveProperty('directory');
		expect(lazySource.registry.skills[0]).not.toHaveProperty('sourceDirectory');
	});

	it('resolves the workspace-backed source only when a skill is loaded', async () => {
		const baseSource = createRuntimeSkillSource('base');
		const materializedSource = createRuntimeSkillSource('materialized');
		const resolveSource = jest.fn(async () => await Promise.resolve(materializedSource));
		const lazySource = createLazyRuntimeSkillSource({ source: baseSource, resolveSource });

		expect(resolveSource).not.toHaveBeenCalled();

		const skill = await lazySource.loadSkill('workflow-auditor');
		const file = await lazySource.loadFile?.('workflow-auditor', 'scripts/audit.ts');

		expect(resolveSource).toHaveBeenCalledTimes(1);
		expect(skill?.instructions).toBe('materialized');
		expect(file?.content).toBe('file:scripts/audit.ts');
		expect(baseSource.loadSkill).not.toHaveBeenCalled();
	});

	it('surfaces workspace materialization failures instead of loading bundled skills', async () => {
		const baseSource = createRuntimeSkillSource('base');
		const resolveError = new Error('sandbox unavailable');
		const lazySource = createLazyRuntimeSkillSource({
			source: baseSource,
			resolveSource: jest.fn(async () => {
				await Promise.resolve();
				throw resolveError;
			}),
		});

		await expect(lazySource.loadSkill('workflow-auditor')).rejects.toThrow(resolveError);
		expect(baseSource.loadSkill).not.toHaveBeenCalled();
	});

	it('requires a materialized workspace-backed source when loading a skill', async () => {
		const baseSource = createRuntimeSkillSource('base');
		const lazySource = createLazyRuntimeSkillSource({
			source: baseSource,
			resolveSource: jest.fn(async () => await Promise.resolve(undefined)),
		});

		await expect(lazySource.loadSkill('workflow-auditor')).rejects.toThrow(
			'Runtime skills require a sandbox workspace',
		);
		expect(baseSource.loadSkill).not.toHaveBeenCalled();
	});
});
