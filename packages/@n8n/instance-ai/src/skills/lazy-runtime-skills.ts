import type {
	RuntimeSkillRegistry,
	RuntimeSkillRegistryEntry,
	RuntimeSkillSource,
} from '@n8n/agents';

export type RuntimeSkillSourceResolver = () => Promise<RuntimeSkillSource | undefined>;

export interface LazyRuntimeSkillSourceOptions {
	source: RuntimeSkillSource;
	resolveSource: RuntimeSkillSourceResolver;
}

export function createLazyRuntimeSkillSource({
	source,
	resolveSource,
}: LazyRuntimeSkillSourceOptions): RuntimeSkillSource {
	let resolvedSourcePromise: Promise<RuntimeSkillSource> | undefined;

	const getResolvedSource = async () => {
		resolvedSourcePromise ??= resolveSource().then((resolvedSource) => resolvedSource ?? source);
		return await resolvedSourcePromise;
	};

	return {
		registry: sanitizeRuntimeSkillRegistry(source.registry),
		loadSkill: async (skillId) => await (await getResolvedSource()).loadSkill(skillId),
		loadFile: async (skillId, filePath) => {
			const resolvedSource = await getResolvedSource();
			return (await resolvedSource.loadFile?.(skillId, filePath)) ?? null;
		},
	};
}

function sanitizeRuntimeSkillRegistry(registry: RuntimeSkillRegistry): RuntimeSkillRegistry {
	return {
		...registry,
		skills: registry.skills.map(sanitizeRuntimeSkillRegistryEntry),
	};
}

function sanitizeRuntimeSkillRegistryEntry(
	entry: RuntimeSkillRegistryEntry,
): RuntimeSkillRegistryEntry {
	const {
		path: _path,
		sourcePath: _sourcePath,
		directory: _directory,
		sourceDirectory: _sourceDirectory,
		...sanitizedEntry
	} = entry;

	return sanitizedEntry;
}
