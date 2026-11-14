<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { SheetFooter } from '$lib/components/ui/sheet';
	import ResponsiveSheet from '$lib/components/responsive-sheet.svelte';

	export let open = false;
	export let onOpenChange: (open: boolean) => void = () => {};
	export let isMobile = false;

	export let interval = 1200;
	export let bindAddress = '0.0.0.0:12345';
	export let bindAddressValid = true;
	export let bindAddressError = '';
	export let cdnSorting = false;
	export let scanDeletedVideos = false;
	export let upperPath = '';
	export let ffmpegPath = '';
	export let favoriteQuickSubscribePath = '';
	export let collectionQuickSubscribePath = '';
	export let submissionQuickSubscribePath = '';
	export let bangumiQuickSubscribePath = '';
	export let pugvQuickSubscribePath = '';

	export let saving = false;
	export let onSave: () => void = () => {};
</script>

<!-- 系统设置抽屉 -->
<ResponsiveSheet
	{open}
	{onOpenChange}
	title="系统设置"
	description="扫描间隔等其他设置"
	titleTooltip="调整扫描间隔、监听端口、路径模板和基础系统行为。"
	{isMobile}
>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			onSave();
		}}
		class="flex flex-col {isMobile ? 'h-[calc(90vh-8rem)]' : 'h-[calc(100vh-12rem)]'}"
	>
		<div class="min-h-0 flex-1 space-y-4 overflow-y-auto {isMobile ? 'px-4 py-4' : 'px-6 py-6'}">
			<!-- Basic System Settings -->
			<div class="mt-2 space-y-4">
				<h3 class="text-base font-semibold">基本系统设置</h3>

				<div class="space-y-2">
					<Label for="interval">扫描间隔（秒）</Label>
					<Input id="interval" type="number" bind:value={interval} min="60" placeholder="1200" />
					<p class="text-muted-foreground text-sm">每次扫描下载的时间间隔</p>
				</div>

				<div class="space-y-2">
					<Label for="bind-address">服务器端口</Label>
					<Input
						id="bind-address"
						type="text"
						bind:value={bindAddress}
						placeholder="0.0.0.0:12345"
						class={bindAddressValid ? '' : 'border-red-500'}
					/>
					{#if bindAddressError}
						<p class="text-sm text-red-500">{bindAddressError}</p>
					{:else}
						<p class="text-muted-foreground text-sm">
							服务器监听地址和端口（修改后需要重启程序生效）
						</p>
					{/if}
				</div>

				<div class="flex items-center space-x-2">
					<input
						type="checkbox"
						id="cdn-sorting"
						bind:checked={cdnSorting}
						class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
					/>
					<Label for="cdn-sorting" class="text-sm">启用CDN排序</Label>
					<p class="text-muted-foreground ml-2 text-sm">优化下载节点选择</p>
				</div>

				<div class="flex items-center space-x-2">
					<input
						type="checkbox"
						id="scan-deleted-videos"
						bind:checked={scanDeletedVideos}
						class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
					/>
					<Label for="scan-deleted-videos" class="text-sm">显示已删除视频</Label>
					<p class="text-muted-foreground ml-2 text-sm">在视频列表中显示已删除的视频</p>
				</div>

				<div class="space-y-2">
					<Label for="upper-path">UP主头像保存路径</Label>
					<Input
						id="upper-path"
						type="text"
						bind:value={upperPath}
						placeholder="config/upper_face"
					/>
					<p class="text-muted-foreground text-sm">UP主头像和person.nfo文件的保存目录路径</p>
				</div>

				<div class="space-y-3">
					<div class="space-y-1">
						<h4 class="text-sm font-medium">快捷订阅路径模板</h4>
						<p class="text-muted-foreground text-sm">
							添加收藏夹、合集、UP主投稿、番剧、课程源时可直接带出保存路径。支持使用 <code
								>{'{{name}}'}</code
							>
							代表源名称。
						</p>
					</div>

					<div class="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
						<div class="space-y-2">
							<Label for="favorite-quick-subscribe-path">收藏夹快捷订阅路径模板</Label>
							<Input
								id="favorite-quick-subscribe-path"
								type="text"
								bind:value={favoriteQuickSubscribePath}
								placeholder={'/Downloads/收藏夹/{{name}}'}
							/>
						</div>

						<div class="space-y-2">
							<Label for="collection-quick-subscribe-path">合集快捷订阅路径模板</Label>
							<Input
								id="collection-quick-subscribe-path"
								type="text"
								bind:value={collectionQuickSubscribePath}
								placeholder={'/Downloads/合集/{{name}}'}
							/>
						</div>

						<div class="space-y-2">
							<Label for="submission-quick-subscribe-path">UP主投稿快捷订阅路径模板</Label>
							<Input
								id="submission-quick-subscribe-path"
								type="text"
								bind:value={submissionQuickSubscribePath}
								placeholder={'/Downloads/UP投稿/{{name}}'}
							/>
						</div>
						<div class="space-y-2">
							<Label for="bangumi-quick-subscribe-path">番剧快捷订阅路径模板</Label>
							<Input
								id="bangumi-quick-subscribe-path"
								type="text"
								bind:value={bangumiQuickSubscribePath}
								placeholder={'/Downloads/番剧/{{name}}'}
							/>
						</div>
						<div class="space-y-2">
							<Label for="pugv-quick-subscribe-path">课程快捷订阅路径模板</Label>
							<Input
								id="pugv-quick-subscribe-path"
								type="text"
								bind:value={pugvQuickSubscribePath}
								placeholder={'/Downloads/课程/{{name}}'}
							/>
						</div>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="ffmpeg-path">ffmpeg 路径（Windows 可选）</Label>
					<Input
						id="ffmpeg-path"
						type="text"
						bind:value={ffmpegPath}
						placeholder="C:\ffmpeg\bin\ffmpeg.exe 或 C:\ffmpeg\bin"
					/>
					<p class="text-muted-foreground text-sm">
						可填写 ffmpeg.exe 的完整路径，或其所在目录；留空时使用系统环境变量 PATH。
					</p>
				</div>

				<div
					class="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950/20"
				>
					<h5 class="mb-2 font-medium text-orange-800 dark:text-orange-200">其他设置说明</h5>
					<div class="space-y-1 text-sm text-orange-700 dark:text-orange-300">
						<p><strong>扫描间隔：</strong>每次扫描下载的时间间隔（秒）</p>
						<p>
							<strong>内存映射优化：</strong
							>已自动启用，使用SQLite内存映射技术优化数据库性能，无需手动配置
						</p>
						<p><strong>CDN排序：</strong>启用后优先使用质量更高的CDN，可能提升下载速度</p>
						<p>
							<strong>显示已删除视频：</strong
							>控制前端列表是否显示已删除的视频（注：与视频源的"扫描已删除视频"功能不同）
						</p>
						<p>
							<strong>UP主头像路径：</strong>UP主头像和person.nfo文件的保存目录，用于媒体库显示
						</p>
						<p>
							<strong>ffmpeg路径：</strong>Windows 推荐配置本地 ffmpeg 路径，避免仅依赖系统环境变量
						</p>
					</div>
				</div>
			</div>
		</div>
		<SheetFooter class={isMobile ? 'pb-safe border-t px-4 pt-3' : 'pb-safe border-t pt-4'}>
			<Button type="submit" disabled={saving} class="w-full">
				{saving ? '保存中...' : '保存设置'}
			</Button>
		</SheetFooter>
	</form>
</ResponsiveSheet>
