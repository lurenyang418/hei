import type { FilterOption } from '$lib/types';

const DEFAULT_AI_SUBTITLE_LANGUAGE = 'zh-CN';

const DEFAULT_FILTER_OPTION: FilterOption = {
	video_max_quality: 'Quality8k',
	video_min_quality: 'Quality360p',
	audio_max_quality: 'QualityHiRES',
	audio_min_quality: 'Quality64k',
	codecs: ['AVC', 'HEV', 'AV1'],
	no_dolby_video: false,
	no_dolby_audio: false,
	no_hdr: false,
	no_hires: false
};

export function cloneFilterOption(option: FilterOption): FilterOption {
	return {
		video_max_quality: option.video_max_quality,
		video_min_quality: option.video_min_quality,
		audio_max_quality: option.audio_max_quality,
		audio_min_quality: option.audio_min_quality,
		codecs: [...option.codecs],
		no_dolby_video: option.no_dolby_video,
		no_dolby_audio: option.no_dolby_audio,
		no_hdr: option.no_hdr,
		no_hires: option.no_hires
	};
}

/**
 * 源表单的下载/AI/过滤选项域：单个源的下载行为、AI 重命名与码率过滤。
 * 这些字段只被提交载荷与批量添加复用，不参与搜索/番剧/投稿等面板逻辑。
 */
export class SourceOptionsStore {
	audioOnly = $state(false);
	audioOnlyM4aOnly = $state(false);
	flatFolder = $state(false);
	splitChaptersAfterDownload = $state(false);
	downloadChargeVideos = $state(true);
	downloadDanmaku = $state(true);
	downloadSubtitle = $state(true);
	downloadAiSubtitle = $state(true);
	aiSubtitleLanguage = $state(DEFAULT_AI_SUBTITLE_LANGUAGE);
	useDynamicApi = $state(false);

	aiRename = $state(false);
	aiRenameVideoPrompt = $state('');
	aiRenameAudioPrompt = $state('');
	showAiRenameAdvanced = $state(false);
	aiRenameEnableMultiPage = $state(false);
	aiRenameEnableCollection = $state(false);
	aiRenameEnableBangumi = $state(false);
	aiRenameRenameParentDir = $state(false);

	filterOptionInheritGlobal = $state(true);
	filterOptionDraft = $state<FilterOption>({
		...DEFAULT_FILTER_OPTION,
		codecs: [...DEFAULT_FILTER_OPTION.codecs]
	});

	/** 提交载荷里这一组选项的字段 */
	toPayload() {
		return {
			audio_only: this.audioOnly,
			audio_only_m4a_only: this.audioOnlyM4aOnly,
			flat_folder: this.flatFolder,
			split_chapters_after_download: this.splitChaptersAfterDownload,
			download_charge_videos: this.downloadChargeVideos,
			download_danmaku: this.downloadDanmaku,
			download_subtitle: this.downloadSubtitle,
			download_ai_subtitle: this.downloadAiSubtitle,
			ai_subtitle_language: this.aiSubtitleLanguage.trim() || DEFAULT_AI_SUBTITLE_LANGUAGE,
			use_dynamic_api: this.useDynamicApi,
			ai_rename: this.aiRename,
			ai_rename_video_prompt: this.aiRenameVideoPrompt.trim() || undefined,
			ai_rename_audio_prompt: this.aiRenameAudioPrompt.trim() || undefined,
			filter_option: this.filterOptionInheritGlobal
				? undefined
				: cloneFilterOption(this.filterOptionDraft),
			ai_rename_enable_multi_page: this.showAiRenameAdvanced
				? this.aiRenameEnableMultiPage
				: undefined,
			ai_rename_enable_collection: this.showAiRenameAdvanced
				? this.aiRenameEnableCollection
				: undefined,
			ai_rename_enable_bangumi: this.showAiRenameAdvanced ? this.aiRenameEnableBangumi : undefined,
			ai_rename_rename_parent_dir: this.showAiRenameAdvanced
				? this.aiRenameRenameParentDir
				: undefined
		};
	}

	/** 不继承全局时必须至少保留一个编解码器 */
	validateCodecs(): boolean {
		return this.filterOptionInheritGlobal || this.filterOptionDraft.codecs.length > 0;
	}

	/** 用全局默认值重置草稿（继承全局时使用） */
	resetFilterDraft(globalDefault: FilterOption): void {
		this.filterOptionDraft = cloneFilterOption(globalDefault);
	}
}
