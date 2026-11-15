import { toast } from 'svelte-sonner';
import api from '$lib/api';
import { runRequest } from '$lib/utils/request.js';
import type { FilterOption, VideoSource } from '$lib/types';

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

function cloneFilterOption(option: FilterOption): FilterOption {
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

export type FilterOptionContext = {
	/** 保存成功后回写本地列表 */
	updateSource: (
		sourceType: string,
		sourceId: number,
		updater: (source: VideoSource) => VideoSource
	) => void;
	/** 源未配置码率时，用全局配置填充编辑器初始值 */
	loadGlobalFilterOption: () => Promise<FilterOption | null>;
};

/**
 * 源级流过滤/码率编辑域：打开时按源配置或全局配置初始化草稿，保存后回写列表。
 */
export class VideoSourceFilterOptionStore {
	dialogOpen = $state(false);
	info = $state<{ type: string; id: number; name: string }>({ type: '', id: 0, name: '' });
	draft = $state<FilterOption>({
		...DEFAULT_FILTER_OPTION,
		codecs: [...DEFAULT_FILTER_OPTION.codecs]
	});
	inheritGlobal = $state(true);
	saving = $state(false);

	#ctx: FilterOptionContext;

	constructor(ctx: FilterOptionContext) {
		this.#ctx = ctx;
	}

	async open(sourceType: string, source: VideoSource): Promise<void> {
		this.info = {
			type: sourceType,
			id: source.id,
			name: source.name
		};
		this.inheritGlobal = !source.filter_option;
		this.draft = cloneFilterOption(source.filter_option ?? DEFAULT_FILTER_OPTION);
		this.dialogOpen = true;

		if (!source.filter_option) {
			const globalOption = await this.#ctx.loadGlobalFilterOption();
			if (globalOption) {
				this.draft = globalOption;
			}
		}
	}

	async save(): Promise<void> {
		if (!this.inheritGlobal && this.draft.codecs.length === 0) {
			toast.error('保存失败', { description: '至少保留一个编解码器' });
			return;
		}

		this.saving = true;
		const result = await runRequest(
			() =>
				api.updateVideoSourceDownloadOptions(this.info.type, this.info.id, {
					filter_option: this.inheritGlobal ? null : cloneFilterOption(this.draft)
				}),
			{ context: '保存源级流过滤设置失败' }
		);
		this.saving = false;
		if (!result) return;

		if (!result.data.success) {
			toast.error('保存失败', { description: result.data.message });
			return;
		}

		this.#ctx.updateSource(this.info.type, this.info.id, (source) => ({
			...source,
			filter_option: result.data.filter_option ?? null
		}));
		toast.success(this.inheritGlobal ? '已恢复继承全局流过滤设置' : '已保存源级码率设置');
		this.dialogOpen = false;
	}
}
