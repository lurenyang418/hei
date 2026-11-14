<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { CustomSelect } from '$lib/components/ui/select';
	import { SheetFooter } from '$lib/components/ui/sheet';
	import ResponsiveSheet from '$lib/components/responsive-sheet.svelte';

	type Option = { value: string; label: string };

	import type { MainConfigStore } from '$lib/stores/settings/config.svelte';

	export let store: MainConfigStore;
	export let open = false;
	export let onOpenChange: (open: boolean) => void = () => {};
	export let isMobile = false;


	const videoQualityOptions: Option[] = [
		{ value: 'Quality8k', label: '8K超高清' },
		{ value: 'QualityDolby', label: '杜比视界' },
		{ value: 'QualityHdr', label: 'HDR真彩' },
		{ value: 'Quality4k', label: '4K超高清' },
		{ value: 'Quality1080p60', label: '1080P 60fps' },
		{ value: 'Quality1080pPLUS', label: '1080P+高码率' },
		{ value: 'Quality1080p', label: '1080P高清' },
		{ value: 'Quality720p', label: '720P高清' },
		{ value: 'Quality480p', label: '480P清晰' },
		{ value: 'Quality360p', label: '360P流畅' }
	];

	const audioQualityOptions: Option[] = [
		{ value: 'QualityHiRES', label: 'Hi-Res无损' },
		{ value: 'Quality192k', label: '192K高品质' },
		{ value: 'QualityDolby', label: '杜比全景声' },
		{ value: 'Quality132k', label: '132K标准' },
		{ value: 'Quality64k', label: '64K省流' }
	];

	const codecOptions: Option[] = [
		{ value: 'AVC', label: 'AVC/H.264' },
		{ value: 'HEV', label: 'HEVC/H.265' },
		{ value: 'AV1', label: 'AV1' }
	];

	let draggedIndex: number | null = null;

	function handleDragStart(event: DragEvent, index: number) {
		if (event.dataTransfer) {
			draggedIndex = index;
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/html', '');
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	function handleDrop(event: DragEvent, dropIndex: number) {
		event.preventDefault();
		if (draggedIndex !== null && draggedIndex !== dropIndex) {
			const next = [...store.codecs];
			const draggedItem = next[draggedIndex];
			next.splice(draggedIndex, 1);
			next.splice(dropIndex, 0, draggedItem);
			store.codecs = next;
		}
		draggedIndex = null;
	}

	function removeCodec(index: number) {
		store.codecs = store.codecs.filter((_, i) => i !== index);
	}
</script>

<!-- 视频质量设置抽屉 -->
<ResponsiveSheet
	{open}
	{onOpenChange}
	title="视频质量设置"
	description="设置视频/音频质量、编解码器等参数"
	titleTooltip="限制视频与音频清晰度、编码格式和优先选择范围。"
	{isMobile}
>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			store.save();
		}}
		class="flex flex-col {isMobile ? 'h-[calc(90vh-8rem)]' : 'h-[calc(100vh-12rem)]'}"
	>
		<div class="flex-1 space-y-6 overflow-y-auto {isMobile ? 'px-4 py-4' : 'px-6 py-6'}">
			<div class="grid grid-cols-1 gap-4 {isMobile ? 'sm:grid-cols-1' : 'md:grid-cols-2'}">
				<div class="space-y-2">
					<Label for="video-max-quality">视频最高质量</Label>
					<CustomSelect
						id="video-max-quality"
						value={store.videoMaxQuality}
						options={videoQualityOptions}
						onChange={(nextValue) => (store.videoMaxQuality = String(nextValue ?? 'Quality8k'))}
						class="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
					/>
				</div>

				<div class="space-y-2">
					<Label for="video-min-quality">视频最低质量</Label>
					<CustomSelect
						id="video-min-quality"
						value={store.videoMinQuality}
						options={videoQualityOptions}
						onChange={(nextValue) => (store.videoMinQuality = String(nextValue ?? 'Quality360p'))}
						class="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
					/>
				</div>

				<div class="space-y-2">
					<Label for="audio-max-quality">音频最高质量</Label>
					<CustomSelect
						id="audio-max-quality"
						value={store.audioMaxQuality}
						options={audioQualityOptions}
						onChange={(nextValue) => (store.audioMaxQuality = String(nextValue ?? 'QualityHiRES'))}
						class="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
					/>
				</div>

				<div class="space-y-2">
					<Label for="audio-min-quality">音频最低质量</Label>
					<CustomSelect
						id="audio-min-quality"
						value={store.audioMinQuality}
						options={audioQualityOptions}
						onChange={(nextValue) => (store.audioMinQuality = String(nextValue ?? 'Quality64k'))}
						class="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
					/>
				</div>
			</div>

			<div class="space-y-2">
				<Label>编解码器优先级顺序</Label>
				<p class="text-muted-foreground mb-3 text-sm">
					拖拽以调整优先级，越靠前优先级越高。根据设备硬件解码支持情况选择：
				</p>
				<div
					class="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/20"
				>
					<div class="space-y-2 text-xs text-blue-700 dark:text-blue-300">
						<div>
							<strong>🎯 AVC (H.264)：</strong
							>兼容性最好，几乎所有设备都支持硬件解码，播放流畅，但文件体积较大
						</div>
						<div>
							<strong>🚀 HEV (H.265)：</strong>新一代编码，体积更小，需要较新设备硬件解码支持
						</div>
						<div>
							<strong>⚡ AV1：</strong>最新编码格式，压缩率最高，需要最新设备支持，软解可能卡顿
						</div>
						<div class="mt-2 border-t border-blue-300 pt-1">
							<strong>💡 推荐设置：</strong
							>如果设备较老或追求兼容性，将AVC放首位；如果设备支持新编码且网络较慢，可优先HEV或AV1
						</div>
					</div>
				</div>
				<div class="space-y-2">
					{#each store.codecs as codec, index (codec)}
						<div
							class="flex cursor-move items-center gap-3 rounded-lg border bg-gray-50 p-3 dark:bg-gray-900"
							draggable="true"
							ondragstart={(e) => handleDragStart(e, index)}
							ondragover={handleDragOver}
							ondrop={(e) => handleDrop(e, index)}
							role="button"
							tabindex="0"
						>
							<div class="flex items-center gap-2 text-gray-400 dark:text-gray-600">
								<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
									<path
										d="M7 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H7zM8 6h4v2H8V6zm0 4h4v2H8v-2z"
									/>
								</svg>
							</div>
							<div class="flex flex-1 items-center gap-2">
								<span
									class="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium"
								>
									{index + 1}
								</span>
								<span class="font-medium">
									{codecOptions.find((option) => option.value === codec)?.label || codec}
								</span>
							</div>
							<button
								type="button"
								class="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
								onclick={() => removeCodec(index)}
								title="移除此编解码器"
								aria-label="移除此编解码器"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>
					{/each}

					{#if store.codecs.length < codecOptions.length}
						<div class="mt-2">
							<CustomSelect
								class="w-full rounded-md border p-2 text-sm"
								value={null}
								options={codecOptions
									.filter((option) => !store.codecs.includes(option.value))
									.map((option) => ({ value: option.value, label: option.label }))}
								placeholder="添加编解码器..."
								clearAfterSelect
								onChange={(nextValue) => {
									const codec = String(nextValue ?? '');
									if (codec && !store.codecs.includes(codec)) {
										store.codecs = [...store.codecs, codec];
									}
								}}
							/>
						</div>
					{/if}
				</div>
			</div>

			<div class="grid grid-cols-1 gap-4 {isMobile ? 'sm:grid-cols-1' : 'md:grid-cols-2'}">
				<div class="flex items-center space-x-2">
					<input
						type="checkbox"
						id="no-dolby-video"
						bind:checked={store.noDolbyVideo}
						class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
					/>
					<Label for="no-dolby-video" class="text-sm">禁用杜比视界</Label>
				</div>

				<div class="flex items-center space-x-2">
					<input
						type="checkbox"
						id="no-dolby-audio"
						bind:checked={store.noDolbyAudio}
						class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
					/>
					<Label for="no-dolby-audio" class="text-sm">禁用杜比全景声</Label>
				</div>

				<div class="flex items-center space-x-2">
					<input
						type="checkbox"
						id="no-hdr"
						bind:checked={store.noHdr}
						class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
					/>
					<Label for="no-hdr" class="text-sm">禁用HDR</Label>
				</div>

				<div class="flex items-center space-x-2">
					<input
						type="checkbox"
						id="no-hires"
						bind:checked={store.noHires}
						class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
					/>
					<Label for="no-hires" class="text-sm">禁用Hi-Res音频</Label>
				</div>
			</div>
		</div>
		<SheetFooter class={isMobile ? 'pb-safe border-t px-4 pt-3' : 'pb-safe border-t pt-4'}>
			<Button type="submit" disabled={store.saving} class="w-full">
				{store.saving ? '保存中...' : '保存设置'}
			</Button>
		</SheetFooter>
	</form>
</ResponsiveSheet>
