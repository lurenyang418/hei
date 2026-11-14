<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { CustomSelect } from '$lib/components/ui/select';
	import { SheetFooter } from '$lib/components/ui/sheet';
	import ResponsiveSheet from '$lib/components/responsive-sheet.svelte';
	import SectionHeader from '$lib/components/section-header.svelte';
	import { EyeIcon } from '@lucide/svelte';
	import type { FilenamePreviewResponse } from '$lib/types';

	type HelpItem = { name: string; desc: string };

	export let open = false;
	export let onOpenChange: (open: boolean) => void = () => {};
	export let isMobile = false;

	export let videoName = '';
	export let pageName = '';
	export let multiPageName = '';
	export let bangumiName = '';
	export let folderStructure = '';
	export let bangumiFolderName = '';
	export let collectionFolderMode = 'unified';
	export let collectionUnifiedName = '';
	export let timeFormat = '';
	export let multiPageUseSeasonStructure = false;
	export let collectionUseSeasonStructure = false;
	export let bangumiUseSeasonStructure = false;
	export let nfoTimeType = 'favtime';
	export let nfoIncludeGenre = false;

	export let videoNameHasPath = false;
	export let multiPageNameHasPath = false;
	export let pageNameValid = true;
	export let pageNameError = '';
	export let multiPageNameValid = true;
	export let multiPageNameError = '';
	export let collectionUnifiedNameValid = true;
	export let collectionUnifiedNameError = '';
	export let filenamePreview: FilenamePreviewResponse | null = null;
	export let filenamePreviewLoading = false;
	export let filenamePreviewError = '';
	export let saving = false;

	export let variableHelp: {
		video: HelpItem[];
		page: HelpItem[];
		common: HelpItem[];
		time: HelpItem[];
	};

	export let onSave: () => void = () => {};
	export let onVideoNameChange: (value: string) => void = () => {};
	export let onMultiPageNameChange: (value: string) => void = () => {};
	export let onValidateCollectionUnifiedName: (value: string) => void = () => {};

	let showHelp = false;

	const nfoTimeTypeOptions = [
		{ value: 'favtime', label: '收藏时间' },
		{ value: 'pubtime', label: '发布时间' }
	];
</script>

<!-- 文件命名设置抽屉 -->
<ResponsiveSheet
	{open}
	{onOpenChange}
	title="文件命名设置"
	description="配置视频、分页、番剧等文件命名模板"
	titleTooltip="调整视频、分页、番剧等文件命名规则，以及目录结构和媒体库兼容方式。"
	{isMobile}
>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			onSave();
		}}
		class="flex flex-col {isMobile ? 'h-[calc(90vh-8rem)]' : 'h-[calc(100vh-12rem)]'}"
	>
		<div class="min-h-0 flex-1 space-y-6 overflow-y-auto {isMobile ? 'px-4 py-4' : 'px-6 py-6'}">
			<SectionHeader title="文件命名模板" titleTooltip="配置视频、分页和番剧的命名模板与变量规则。">
				{#snippet actions()}
					<button
						type="button"
						onclick={() => (showHelp = !showHelp)}
						class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
					>
						{showHelp ? '隐藏' : '显示'}变量说明
					</button>
				{/snippet}
			</SectionHeader>

			{#if showHelp}
				<div
					class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20"
				>
					<div
						class="grid grid-cols-1 gap-4 text-sm {isMobile ? 'sm:grid-cols-1' : 'md:grid-cols-2'}"
					>
						<div>
							<h4 class="mb-2 font-medium text-blue-900 dark:text-blue-200">视频变量</h4>
							<div class="space-y-1">
								{#each variableHelp.video as item (item.name)}
									<div class="flex">
										<code
											class="mr-2 rounded bg-blue-100 px-1 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
											>{item.name}</code
										>
										<span class="text-gray-600 dark:text-gray-400">{item.desc}</span>
									</div>
								{/each}
							</div>
						</div>
						<div>
							<h4 class="mb-2 font-medium text-blue-900 dark:text-blue-200">分页变量</h4>
							<div class="space-y-1">
								{#each variableHelp.page as item (item.name)}
									<div class="flex">
										<code
											class="mr-2 rounded bg-blue-100 px-1 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
											>{item.name}</code
										>
										<span class="text-gray-600 dark:text-gray-400">{item.desc}</span>
									</div>
								{/each}
							</div>
							<h4 class="mt-4 mb-2 font-medium text-blue-900 dark:text-blue-200">通用函数</h4>
							<div class="space-y-1">
								{#each variableHelp.common as item (item.name)}
									<div class="flex">
										<code
											class="mr-2 rounded bg-blue-100 px-1 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
											>{item.name}</code
										>
										<span class="text-gray-600 dark:text-gray-400">{item.desc}</span>
									</div>
								{/each}
							</div>
						</div>
						<div class="md:col-span-2">
							<h4 class="mb-2 font-medium text-blue-900 dark:text-blue-200">时间格式变量</h4>
							<div class="grid grid-cols-3 gap-2">
								{#each variableHelp.time as item (item.name)}
									<div class="flex">
										<code
											class="mr-2 rounded bg-blue-100 px-1 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
											>{item.name}</code
										>
										<span class="text-gray-600 dark:text-gray-400">{item.desc}</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			{/if}

			<div class="mb-4">
				<h4 class="text-lg font-medium">文件命名设置</h4>
			</div>

			<!-- 互斥提示面板 -->
			{#if videoNameHasPath && multiPageNameHasPath}
				<div
					class="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20"
				>
					<h5 class="mb-2 font-medium text-red-800 dark:text-red-200">🚨 路径冲突检测</h5>
					<p class="text-sm text-red-700 dark:text-red-300">
						检测到视频文件名模板和多P视频文件名模板都设置了路径分隔符，这会导致文件夹嵌套混乱。<br
						/>
						<strong>建议：</strong>只在其中一个模板中设置路径，另一个模板只控制文件名。
					</p>
				</div>
			{/if}

			<!-- 互斥规则说明 -->
			<div
				class="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950/20"
			>
				<h5 class="mb-2 font-medium text-yellow-800 dark:text-yellow-200">💡 智能路径管理</h5>
				<p class="text-sm text-yellow-700 dark:text-yellow-300">
					为避免文件夹嵌套混乱，系统会自动处理路径冲突：<br />
					• 当您在一个模板中设置路径时，另一个模板会自动移除路径设置<br />
					• 推荐在"视频文件名模板"中设置UP主分类，在"多P模板"中只设置文件名
				</p>
			</div>

			<div class="grid grid-cols-1 gap-4 {isMobile ? 'sm:grid-cols-1' : 'md:grid-cols-2'}">
				<div class="space-y-2">
					<Label for="video-name">视频文件名模板</Label>
					<Input
						id="video-name"
						bind:value={videoName}
						placeholder={`{{upper_name}}`}
						class={multiPageNameHasPath ? 'border-orange-400 bg-orange-50' : ''}
						oninput={(e) => onVideoNameChange((e.target as HTMLInputElement)?.value || '')}
					/>
					{#if multiPageNameHasPath && videoNameHasPath}
						<p class="text-xs text-orange-600 dark:text-orange-400">
							⚠️ 多P模板已设置路径，此模板将自动移除路径设置避免冲突
						</p>
					{/if}
					<p class="text-muted-foreground text-xs">控制主要文件夹结构，支持使用 / 创建子目录</p>
				</div>

				<div class="space-y-2">
					<Label for="page-name">单P视频文件名模板</Label>
					<Input
						id="page-name"
						bind:value={pageName}
						placeholder={`{{pubtime}}-{{bvid}}`}
						class={pageNameValid ? '' : 'border-red-500 focus:border-red-500'}
					/>
					{#if pageNameError}
						<p class="text-xs text-red-500 dark:text-red-400">{pageNameError}</p>
					{/if}
					<p class="text-muted-foreground text-xs">
						控制单P视频的具体文件名，<strong>不允许使用路径分隔符 / 或 \</strong>
					</p>
				</div>

				<div class="space-y-2">
					<Label for="multi-page-name">多P视频文件名模板</Label>
					<Input
						id="multi-page-name"
						bind:value={multiPageName}
						placeholder={`P{{pid_pad}}.{{ptitle}}`}
						class={!multiPageNameValid
							? 'border-red-500 focus:border-red-500'
							: videoNameHasPath && multiPageNameHasPath
								? 'border-orange-400 bg-orange-50'
								: ''}
						oninput={(e) => onMultiPageNameChange((e.target as HTMLInputElement)?.value || '')}
					/>
					{#if multiPageNameError}
						<p class="text-xs text-red-500 dark:text-red-400">{multiPageNameError}</p>
					{/if}
					{#if !multiPageNameError && videoNameHasPath && multiPageNameHasPath}
						<p class="text-xs text-orange-600 dark:text-orange-400">
							⚠️ 检测到路径冲突：视频文件名模板和多P模板都包含路径，系统将自动调整避免冲突
						</p>
					{/if}
					<p class="text-muted-foreground text-xs">
						控制多P视频的具体文件名，<strong>不允许使用路径分隔符 / 或 \</strong>。
						如果需要目录结构，请在视频文件名模板中设置，避免与视频文件名模板冲突。
					</p>
				</div>

				<!-- 多P视频Season结构设置 -->
				<div class="space-y-2">
					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="multi-page-season"
							bind:checked={multiPageUseSeasonStructure}
							class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
						/>
						<Label
							for="multi-page-season"
							class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							多P视频使用Season文件夹结构
						</Label>
					</div>
					<p class="text-muted-foreground text-xs">
						启用后将为多P视频创建"Season 01"子文件夹，提升媒体库兼容性（如Emby/Jellyfin）
					</p>
				</div>

				<!-- 合集Season结构设置 -->
				<div class="space-y-2">
					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="collection-season"
							bind:checked={collectionUseSeasonStructure}
							class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
						/>
						<Label
							for="collection-season"
							class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							合集使用Season文件夹结构
						</Label>
					</div>
					<p class="text-muted-foreground text-xs">
						启用后将为合集创建"Season 01"子文件夹，与多P视频相同的媒体库结构
					</p>
				</div>

				<!-- 番剧Season结构设置 -->
				<div class="space-y-2">
					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="bangumi-season"
							bind:checked={bangumiUseSeasonStructure}
							class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
						/>
						<Label
							for="bangumi-season"
							class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							番剧使用统一Season文件夹结构
						</Label>
					</div>
					<p class="text-muted-foreground text-xs">
						启用后多季番剧将创建统一根目录，在其下按"Season 01"、"Season
						02"分季存放，提升媒体库识别度
					</p>
				</div>

				<div class="space-y-2">
					<Label for="bangumi-name">番剧文件名模板</Label>
					<Input id="bangumi-name" bind:value={bangumiName} placeholder={`第{{pid_pad}}集`} />
					<p class="text-muted-foreground text-xs">控制番剧的季度文件夹和集数文件名</p>
				</div>

				<div class="space-y-2">
					<Label for="bangumi-folder-name">番剧文件夹名模板</Label>
					<Input
						id="bangumi-folder-name"
						bind:value={bangumiFolderName}
						placeholder={`{{title}}`}
					/>
					<p class="text-muted-foreground text-xs">控制番剧主文件夹的命名，包含元数据文件</p>
				</div>
			</div>

			<div class="bg-muted/20 rounded-lg border p-4">
				<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
					<div class="flex items-center gap-2">
						<EyeIcon class="text-muted-foreground h-4 w-4" />
						<h4 class="text-sm font-medium">命名预览</h4>
					</div>
					{#if filenamePreviewLoading}
						<span class="text-muted-foreground text-xs">更新中...</span>
					{/if}
				</div>

				{#if filenamePreviewError}
					<div
						class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300"
					>
						{filenamePreviewError}
					</div>
				{:else if filenamePreview}
					{#if filenamePreview.warnings.length > 0}
						<div
							class="mb-3 space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300"
						>
							{#each filenamePreview.warnings as warning (warning)}
								<p>{warning}</p>
							{/each}
						</div>
					{/if}

					<div class="space-y-2">
						{#each filenamePreview.items as item (item.key)}
							{#each item.files as file (`${item.key}-${file.path}`)}
								<div
									class="bg-background grid grid-cols-1 gap-2 rounded-md border px-3 py-2 {item.active
										? ''
										: 'opacity-70'} {isMobile
										? ''
										: 'md:grid-cols-[7rem_minmax(0,1fr)] md:items-center'}"
								>
									<div class="flex min-w-0 items-center gap-2">
										<span class="text-sm font-medium">{item.title}</span>
										{#if !item.active}
											<Badge variant="outline">未生效</Badge>
										{/if}
									</div>
									<code
										class="bg-muted block overflow-x-auto rounded border px-2 py-1 text-xs whitespace-nowrap"
										>{file.path}</code
									>
								</div>
							{/each}
						{/each}
					</div>
				{:else}
					<div class="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
						打开文件命名设置后会自动生成预览。
					</div>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="folder-structure">文件夹结构模板</Label>
				<Input id="folder-structure" bind:value={folderStructure} placeholder="Season 1" />
				<p class="text-muted-foreground text-sm">定义视频文件的文件夹层级结构</p>
			</div>

			<div class="grid grid-cols-1 gap-4 {isMobile ? 'sm:grid-cols-1' : 'md:grid-cols-2'}">
				<div class="space-y-2">
					<Label for="collection-folder-mode">合集/投稿目录模式</Label>
					<CustomSelect
						id="collection-folder-mode"
						value={collectionFolderMode}
						options={[
							{ value: 'separate', label: '分离模式' },
							{ value: 'unified', label: '统一模式' },
							{ value: 'up_seasonal', label: '投稿源同UP分季（仅投稿源）' }
						]}
						onChange={(nextValue) => (collectionFolderMode = String(nextValue ?? 'unified'))}
						class="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
					/>
					<p class="text-muted-foreground text-sm">
						分离模式：每个视频独立文件夹<br />
						统一模式：所有视频在合集文件夹下<br />
						投稿源同UP分季：仅作用于UP主投稿源（含投稿内UGC合集/多P），不作用于独立合集源
					</p>
				</div>

				<div class="space-y-2">
					<Label for="time-format">时间格式</Label>
					<Input id="time-format" bind:value={timeFormat} placeholder="%Y%m%d%H%M%S" />
					<p class="text-muted-foreground text-sm">控制时间变量的显示格式</p>
				</div>

				<div class="space-y-2 {isMobile ? '' : 'md:col-span-2'}">
					<Label for="collection-unified-name">合集统一命名模板</Label>
					<Input
						id="collection-unified-name"
						bind:value={collectionUnifiedName}
						placeholder={`S01E{{episode_pad}}{{#if is_multi_page}}P{{pid_pad}}{{/if}} - {{title}}`}
						class={collectionUnifiedNameValid ? '' : 'border-red-500 focus:border-red-500'}
						oninput={(e) =>
							onValidateCollectionUnifiedName((e.target as HTMLInputElement)?.value || '')}
					/>
					{#if collectionUnifiedNameError}
						<p class="text-xs text-red-500 dark:text-red-400">{collectionUnifiedNameError}</p>
					{/if}
					<p class="text-muted-foreground text-xs">
						仅在“合集/投稿目录模式=统一模式/投稿源同UP分季”生效，默认保持 S01E.. 命名。<strong
							>不允许使用路径分隔符 / 或 \\</strong
						>。
					</p>
				</div>
			</div>

			<div class="space-y-2">
				<Label for="nfo-time-type">NFO文件时间类型</Label>
				<CustomSelect
					id="nfo-time-type"
					value={nfoTimeType}
					options={nfoTimeTypeOptions}
					onChange={(nextValue) => (nfoTimeType = String(nextValue ?? 'favtime'))}
					class="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
				/>
				<p class="text-muted-foreground text-sm">
					选择NFO文件中使用的时间类型。
					<span class="font-medium text-amber-600">注意：</span>
					更改此设置后，系统会自动重置所有NFO相关任务状态，并立即开始重新生成NFO文件以应用新的时间类型。
				</p>
			</div>

			<div class="space-y-2">
				<div class="flex items-center space-x-2">
					<input
						type="checkbox"
						id="nfo-include-genre"
						bind:checked={nfoIncludeGenre}
						class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
					/>
					<Label for="nfo-include-genre" class="text-sm">NFO写入&lt;genre&gt;标签</Label>
				</div>
				<p class="text-muted-foreground text-sm">
					关闭后，新生成的 NFO 不再写入 <code>&lt;genre&gt;</code> 标签。
					<span class="font-medium text-amber-600">注意：</span>
					更改此设置不会改动已有 NFO 文件，只会影响之后新生成的 NFO。
				</p>
			</div>

			<!-- Season结构说明 -->
			<div
				class="mt-6 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/20"
			>
				<h5 class="mb-2 font-medium text-green-800 dark:text-green-200">多P视频Season结构说明</h5>
				<div class="space-y-1 text-sm text-green-700 dark:text-green-300">
					<p><strong>启用后：</strong>多P视频将采用与番剧相同的目录结构</p>
					<p><strong>目录层级：</strong>视频名称/Season 01/分P文件</p>
					<p><strong>媒体库兼容：</strong>Emby/Jellyfin能正确识别为TV Show剧集</p>
					<p><strong>文件命名：</strong>保持现有的multi_page_name模板不变</p>
					<p class="text-green-600 dark:text-green-400">
						<strong>注意：</strong>默认关闭保持向后兼容，启用后新下载的多P视频将使用新结构
					</p>
				</div>
			</div>

			<div
				class="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/20"
			>
				<h5 class="mb-2 font-medium text-blue-800 dark:text-blue-200">番剧Season结构说明</h5>
				<div class="space-y-1 text-sm text-blue-700 dark:text-blue-300">
					<p><strong>启用后：</strong>多季番剧将创建统一的系列根目录</p>
					<p><strong>智能识别：</strong>自动从"灵笼 第二季"中提取"灵笼"作为系列名</p>
					<p><strong>目录层级：</strong>系列名/Season 01、Season 02/剧集文件</p>
					<p><strong>媒体库优势：</strong>Emby/Jellyfin能正确识别同一系列的不同季度</p>
					<p><strong>文件命名：</strong>保持现有的bangumi_name模板不变</p>
					<p class="text-blue-600 dark:text-blue-400">
						<strong>注意：</strong>默认关闭保持向后兼容，仅影响新下载的番剧
					</p>
				</div>
			</div>
		</div>
		<SheetFooter class={isMobile ? 'pb-safe border-t px-4 pt-3' : 'pb-safe border-t pt-4'}>
			<Button type="submit" disabled={saving || !pageNameValid} class="w-full">
				{saving ? '保存中...' : '保存设置'}
			</Button>
			{#if !pageNameValid}
				<p class="text-center text-xs text-red-500 dark:text-red-400">请修复配置错误后再保存</p>
			{/if}
		</SheetFooter>
	</form>
</ResponsiveSheet>
