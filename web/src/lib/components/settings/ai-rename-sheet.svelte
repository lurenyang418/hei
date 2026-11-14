<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { CustomSelect } from '$lib/components/ui/select';
	import { SheetFooter } from '$lib/components/ui/sheet';
	import ResponsiveSheet from '$lib/components/responsive-sheet.svelte';
	import { RefreshCwIcon } from '@lucide/svelte';

	import type { AiRenameSettingsStore } from '$lib/stores/settings/ai-rename.svelte';

	export let store: AiRenameSettingsStore;
	export let open = false;
	export let onOpenChange: (open: boolean) => void = () => {};
	export let isMobile = false;
</script>

<!-- AI重命名设置抽屉 -->
<ResponsiveSheet
	{open}
	{onOpenChange}
	title="AI重命名设置"
	description="配置AI自动重命名功能，使用大语言模型为视频文件生成更好的文件名"
	titleTooltip="配置 AI 自动重命名的启用范围、提示词和相关行为。"
	{isMobile}
>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			store.save();
		}}
		class="flex flex-col {isMobile ? 'h-[calc(90vh-8rem)]' : 'h-[calc(100vh-12rem)]'}"
	>
		<div class="min-h-0 flex-1 space-y-4 overflow-y-auto {isMobile ? 'px-4 py-4' : 'px-6 py-6'}">
			<!-- 功能说明 -->
			<div
				class="rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-950/20"
			>
				<h4 class="mb-1.5 font-medium text-purple-800 dark:text-purple-400">功能说明</h4>
				<p class="text-xs text-purple-700 dark:text-purple-300">
					AI重命名功能会在视频下载完成后，使用大语言模型分析视频标题、UP主等信息，自动生成更规范、更易读的文件名。
					使用 OpenAI 兼容的 API（DeepSeek 官方或其它兼容服务）。
				</p>
			</div>

			<div class="space-y-3">
				<!-- 启用AI重命名 -->
				<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="ai-rename-enabled"
							bind:checked={store.enabled}
							class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
						/>
						<Label
							for="ai-rename-enabled"
							class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							启用AI重命名（全局开关）
						</Label>
					</div>
					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="ai-rename-rename-parent-dir"
							bind:checked={store.renameParentDir}
							class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
						/>
						<Label
							for="ai-rename-rename-parent-dir"
							class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							允许重命名上级目录（默认关闭）
						</Label>
					</div>
				</div>
				<p class="text-muted-foreground text-xs">
					启用后，还需要在视频源管理页面为单个视频源开启AI重命名功能才会生效
				</p>

				<!-- API提供商 + 请求超时 -->
				<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="ai-rename-provider">API提供商</Label>
						<CustomSelect
							id="ai-rename-provider"
							value={store.provider}
							options={[
								{ value: 'deepseek', label: 'DeepSeek 官方' },
								{ value: 'custom', label: 'OpenAI 兼容' }
							]}
							onChange={(nextValue) => (store.provider = String(nextValue ?? 'deepseek'))}
							class="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
						/>
						<p class="text-muted-foreground text-xs">使用 OpenAI 兼容接口，需要 API Key</p>
					</div>
					<div class="space-y-2">
						<Label for="ai-rename-timeout">请求超时时间（秒）</Label>
						<Input
							id="ai-rename-timeout"
							type="number"
							bind:value={store.timeoutSeconds}
							min="10"
							max="120"
							placeholder="30"
						/>
					</div>
				</div>

				<!-- API Base URL / API Key / 模型名称 -->
				<div class="grid grid-cols-1 gap-3 md:grid-cols-10">
					<div class="space-y-2 md:col-span-3">
						<Label for="ai-rename-base-url">API Base URL</Label>
						<Input
							id="ai-rename-base-url"
							type="text"
							bind:value={store.baseUrl}
							placeholder="https://api.deepseek.com/v1"
						/>
						<p class="text-muted-foreground text-xs">
							DeepSeek: https://api.deepseek.com/v1 | OpenAI: https://api.openai.com/v1
						</p>
					</div>

					<div class="space-y-2 md:col-span-4">
						<Label for="ai-rename-api-key">API Key</Label>
						<Input
							id="ai-rename-api-key"
							type="password"
							bind:value={store.apiKey}
							placeholder="sk-xxxxxxxxxxxxxxxx"
						/>
						<p class="text-muted-foreground text-xs">
							请从API提供商获取API密钥，密钥将安全存储在本地配置中
						</p>
					</div>

					<div class="space-y-2 md:col-span-3">
						<Label for="ai-rename-model">模型名称</Label>
						<div class="flex gap-2">
							<Input
								id="ai-rename-model"
								type="text"
								bind:value={store.model}
								placeholder="deepseek-v4-flash"
								list="ai-rename-model-options"
							/>
							<datalist id="ai-rename-model-options">
								{#each store.models as model (model)}
									<option value={model}></option>
								{/each}
							</datalist>
							<Button
								type="button"
								variant="outline"
								size="sm"
								class="flex-shrink-0 px-2"
								onclick={() => store.fetchModels()}
								disabled={store.modelsLoading}
								title="获取模型列表"
								aria-label="获取模型列表"
							>
								<RefreshCwIcon class="h-4 w-4 {store.modelsLoading ? 'animate-spin' : ''}" />
							</Button>
						</div>
						<p class="text-muted-foreground text-xs">
							可点「获取模型」从服务商 GET /models 拉取列表（需 API Key）；也可直接填写。
						</p>
					</div>
				</div>

				<!-- 视频提示词 -->
				<div class="space-y-2">
					<Label for="ai-rename-video-hint">视频重命名提示词（可选）</Label>
					<textarea
						id="ai-rename-video-hint"
						bind:value={store.videoPromptHint}
						placeholder="例如：保留集数信息，使用中文括号"
						class="border-input bg-background ring-offset-background focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
					></textarea>
					<p class="text-muted-foreground text-xs">自定义提示词，用于指导AI如何重命名视频文件</p>
				</div>

				<!-- 音频提示词 -->
				<div class="space-y-2">
					<Label for="ai-rename-audio-hint">音频重命名提示词（可选）</Label>
					<textarea
						id="ai-rename-audio-hint"
						bind:value={store.audioPromptHint}
						placeholder="例如：保留歌手名称和专辑信息"
						class="border-input bg-background ring-offset-background focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
					></textarea>
					<p class="text-muted-foreground text-xs">
						自定义提示词，用于指导AI如何重命名音频文件（仅下载音频模式）
					</p>
				</div>

				<!-- 提示词写法说明 -->
				<div class="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/20">
					<p class="text-sm text-amber-700 dark:text-amber-300">
						<strong>⚠️ 注意：</strong
						>提示词需具体明确，模糊的描述（如"作者"）可能被理解为UP主而非歌手。
					</p>
					<div class="space-y-1 text-sm text-amber-700 dark:text-amber-300">
						<p><strong>💡 写法：</strong>AI会严格按格式生成，不添加额外信息。</p>
						<p>
							<code class="rounded bg-amber-200 px-1 dark:bg-amber-800">示例：BV号-歌手名-日期</code
							>（歌手从标题《》前提取，日期用YYYYMMDD）
						</p>
						<p>可用字段：BV号、UP主、标题、歌手、分区、日期、排序位置等</p>
					</div>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
				<!-- 使用说明 -->
				<div class="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/20">
					<p class="text-sm text-blue-700 dark:text-blue-300">
						<strong>使用说明：</strong>
					</p>
					<div class="space-y-1 text-sm text-blue-700 dark:text-blue-300">
						<p>1. 在此页面配置API密钥并启用全局开关</p>
						<p>2. 在"视频源管理"页面为需要AI重命名的视频源开启开关</p>
						<p>3. 新下载的视频将自动使用AI生成的文件名</p>
						<p>4. 多P视频/合集/番剧的高级选项在各视频源的AI重命名设置中单独配置</p>
					</div>
				</div>

				<!-- 费用提示 -->
				<div class="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/20">
					<p class="text-sm text-amber-700 dark:text-amber-300">
						<strong>费用提示：</strong>
					</p>
					<div class="space-y-1 text-sm text-amber-700 dark:text-amber-300">
						<p>• DeepSeek API价格实惠，约￥0.001/千token</p>
						<p>• OpenAI GPT-4o-mini约$0.15/百万token</p>
						<p>• 每次重命名约消耗100-200个token</p>
					</div>
				</div>
			</div>
		</div>
		<SheetFooter class={isMobile ? 'pb-safe border-t px-4 pt-3' : 'pb-safe border-t pt-4'}>
			<div class="flex w-full gap-2">
				<Button
					type="button"
					variant="outline"
					onclick={() => store.clearCache()}
					disabled={store.clearingCache}
					class="flex-shrink-0 text-orange-600 hover:text-orange-700 dark:text-orange-400"
				>
					{store.clearingCache ? '清除中...' : '清除全部缓存'}
				</Button>
				<Button type="submit" disabled={store.saving} class="flex-1">
					{store.saving ? '保存中...' : '保存设置'}
				</Button>
			</div>
		</SheetFooter>
	</form>
</ResponsiveSheet>
