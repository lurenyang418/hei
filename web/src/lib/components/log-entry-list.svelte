<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { AlertTriangle, Bug, Info, XCircle } from '@lucide/svelte';

	type LogLevel = 'info' | 'warn' | 'error' | 'debug';

	interface LogEntry {
		timestamp: string;
		level: LogLevel;
		message: string;
		target?: string;
	}

	export let logs: LogEntry[] = [];
	export let isLoading = false;
	export let isMobile = false;
	export let container: HTMLDivElement | null = null;
	export let formatTimestamp: (timestamp: string) => string = () => '';
	export let onMouseEnter: () => void = () => {};
	export let onMouseLeave: () => void = () => {};

	// 日志级别颜色映射
	const levelColors: Record<LogLevel, string> = {
		info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
		warn: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
		error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
		debug: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
	};

	// 日志级别图标映射
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const levelIcons: Record<LogLevel, any> = {
		info: Info,
		warn: AlertTriangle,
		error: XCircle,
		debug: Bug
	};
</script>

<div
	bind:this={container}
	class="h-[600px] overflow-auto"
	role="log"
	aria-label="系统日志列表"
	aria-live="off"
	onmouseenter={onMouseEnter}
	onmouseleave={onMouseLeave}
>
	{#if logs.length === 0}
		<div class="text-muted-foreground flex h-32 items-center justify-center">
			{isLoading ? '加载中...' : '暂无日志'}
		</div>
	{:else}
		<div class="space-y-1 p-4">
			{#each logs as log, index (index)}
				<div class="mb-3 border-b border-gray-100 pb-3 last:border-b-0">
					<div class="flex {isMobile ? 'flex-col gap-2' : 'items-start justify-between'}">
						<div class="flex flex-1 items-start gap-3">
							<svelte:component
								this={levelIcons[log.level]}
								class="mt-1 h-4 w-4 flex-shrink-0 text-{log.level === 'error'
									? 'red'
									: log.level === 'warn'
										? 'yellow'
										: log.level === 'info'
											? 'blue'
											: 'gray'}-500"
							/>
							<div class="min-w-0 flex-1">
								<div
									class="flex {isMobile ? 'flex-col gap-1' : 'items-center gap-2'} mb-1"
								>
									<Badge variant="outline" class={levelColors[log.level]}>
										{log.level.toUpperCase()}
									</Badge>
									{#if log.target}
										<span class="text-muted-foreground font-mono text-xs"
											>{log.target}</span
										>
									{/if}
								</div>
								<p class="text-sm break-words">{log.message}</p>
							</div>
						</div>
						<div
							class="text-muted-foreground font-mono text-xs {isMobile
								? 'text-left'
								: 'text-right'} flex-shrink-0"
						>
							{formatTimestamp(log.timestamp)}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
