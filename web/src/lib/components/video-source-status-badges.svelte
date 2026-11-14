<script lang="ts">
	import type { VideoSource } from '$lib/types';

	export let source: VideoSource;
	export let getAiSubtitleLanguageLabel: (language?: string | null) => string = () => '';
</script>

<!-- 扫描/过滤/下载选项状态展示 -->
{#if source.scan_deleted_videos}
	<div class="mt-1 text-xs text-blue-600">扫描删除视频已持续启用</div>
{:else if source.scan_deleted_videos_once}
	<div class="mt-1 text-xs text-orange-600">本轮扫描删除视频已启用</div>
{/if}
{#if source.keyword_filters && source.keyword_filters.length > 0}
	<div class="mt-1 text-xs text-purple-600">
		已配置 {source.keyword_filters.length} 个关键词过滤器
	</div>
{/if}
<!-- 下载选项状态显示 -->
<div class="mt-1 flex flex-wrap gap-2 text-xs">
	{#if source.audio_only}
		<span class="text-amber-600">仅音频模式</span>
		{#if source.audio_only_m4a_only}
			<span class="text-amber-500">仅M4A</span>
		{/if}
	{/if}
	{#if source.flat_folder}
		<span class="text-purple-600">平铺目录</span>
	{/if}

	{#if source.split_chapters_after_download}
		<span class="text-emerald-600">分章下载</span>
	{/if}
	{#if source.filter_option}
		<span class="text-cyan-600">自定义码率</span>
	{/if}
	{#if source.download_charge_videos === false}
		<span class="text-pink-600">充电视频下载已禁用</span>
	{/if}
	{#if source.use_dynamic_api}
		<span class="text-blue-600">动态API已启用</span>
	{/if}
	{#if source.download_danmaku === false}
		<span class="text-gray-500">弹幕下载已禁用</span>
	{/if}
	{#if source.download_subtitle === false}
		<span class="text-gray-500">字幕下载已禁用</span>
	{:else if source.download_ai_subtitle === false}
		<span class="text-gray-500">AI 字幕已禁用</span>
	{:else}
		<span class="text-blue-600">
			AI 字幕
			{getAiSubtitleLanguageLabel(source.ai_subtitle_language)}
		</span>
	{/if}
	{#if source.ai_rename}
		<span class="text-blue-600">
			AI重命名已启用{#if source.ai_rename_video_prompt || source.ai_rename_audio_prompt}（自定义提示词）{/if}
		</span>
	{/if}
</div>
