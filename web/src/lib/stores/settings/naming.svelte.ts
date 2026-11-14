import { toast } from 'svelte-sonner';
import api from '$lib/api';
import type { ConfigResponse, FilenamePreviewResponse } from '$lib/types';

const DEFAULT_VIDEO_NAME = '{{upper_name}}';
const DEFAULT_PAGE_NAME = '{{pubtime}}-{{bvid}}';
const DEFAULT_MULTI_PAGE_NAME = 'P{{pid_pad}}.{{ptitle}}';
const DEFAULT_BANGUMI_NAME = '{{title}} S{{season_pad}}E{{pid_pad}} - {{ptitle}}';
const DEFAULT_FOLDER_STRUCTURE = 'Season {{season_pad}}';
const DEFAULT_BANGUMI_FOLDER_NAME = '{{title}}';
const DEFAULT_COLLECTION_UNIFIED_NAME =
	'S01E{{episode_pad}}{{#if is_multi_page}}P{{pid_pad}}{{/if}} - {{title}}';
const PREVIEW_DEBOUNCE_MS = 300;

// 检查模板是否包含路径
function hasPathSeparator(value: string): boolean {
	return value.includes('/') || value.includes('\\');
}

// 仅检查 Handlebars 标签外的路径分隔符（避免把 {{/if}} 误判为路径）
function hasPathSeparatorOutsideHandlebars(value: string): boolean {
	let inTag = false;
	let tagEndLen = 0;

	for (let i = 0; i < value.length; i++) {
		if (!inTag && value[i] === '{' && value[i + 1] === '{') {
			let startLen = 2;
			while (i + startLen < value.length && value[i + startLen] === '{' && startLen < 4) {
				startLen++;
			}
			inTag = true;
			tagEndLen = startLen;
			i += startLen - 1;
			continue;
		}

		if (inTag) {
			const end = '}'.repeat(tagEndLen);
			if (tagEndLen > 0 && value.startsWith(end, i)) {
				inTag = false;
				tagEndLen = 0;
				i += end.length - 1;
			}
			continue;
		}

		if (value[i] === '/' || value[i] === '\\') return true;
	}

	return false;
}

function getRequestErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (error && typeof error === 'object' && 'message' in error) {
		const message = (error as { message?: unknown }).message;
		if (typeof message === 'string') return message;
	}
	return '命名模板预览失败';
}

/**
 * 文件命名设置域：命名模板状态 + 实时校验 + 模板预览。
 * 保存动作仍由页面的 saveConfig 统一提交（命名只是主配置的一个分组）。
 */
export class SettingsNamingStore {
	videoName = $state(DEFAULT_VIDEO_NAME);
	pageName = $state(DEFAULT_PAGE_NAME);
	multiPageName = $state(DEFAULT_MULTI_PAGE_NAME);
	bangumiName = $state(DEFAULT_BANGUMI_NAME);
	folderStructure = $state(DEFAULT_FOLDER_STRUCTURE);
	bangumiFolderName = $state(DEFAULT_BANGUMI_FOLDER_NAME);
	collectionFolderMode = $state('unified');
	collectionUnifiedName = $state(DEFAULT_COLLECTION_UNIFIED_NAME);
	timeFormat = $state('%Y%m%d%H%M%S');
	nfoTimeType = $state('favtime');
	nfoIncludeGenre = $state(true);

	multiPageUseSeasonStructure = $state(false);
	collectionUseSeasonStructure = $state(false);
	bangumiUseSeasonStructure = $state(false);

	preview = $state<FilenamePreviewResponse | null>(null);
	previewLoading = $state(false);
	previewError = $state('');

	ready = $state(false);

	// 校验结果由模板内容派生，页面不再手动同步
	pageNameError = $derived(
		hasPathSeparatorOutsideHandlebars(this.pageName)
			? '单P视频文件名模板不应包含路径分隔符 / 或 \\'
			: ''
	);
	pageNameValid = $derived(this.pageNameError === '');
	multiPageNameError = $derived(
		hasPathSeparatorOutsideHandlebars(this.multiPageName)
			? '多P视频文件名模板不应包含路径分隔符 / 或 \\'
			: ''
	);
	multiPageNameValid = $derived(this.multiPageNameError === '');
	collectionUnifiedNameError = $derived.by(() => {
		const trimmed = this.collectionUnifiedName.trim();
		if (!trimmed) return '';
		return hasPathSeparatorOutsideHandlebars(trimmed)
			? '合集统一命名模板不应包含路径分隔符 / 或 \\\\'
			: '';
	});
	collectionUnifiedNameValid = $derived(this.collectionUnifiedNameError === '');
	videoNameHasPath = $derived(hasPathSeparator(this.videoName));
	multiPageNameHasPath = $derived(hasPathSeparator(this.multiPageName));

	/** 预览请求签名：任一命名相关字段变化都会生成新签名 */
	signature = $derived(
		JSON.stringify({
			videoName: this.videoName,
			pageName: this.pageName,
			multiPageName: this.multiPageName,
			bangumiName: this.bangumiName,
			folderStructure: this.folderStructure,
			bangumiFolderName: this.bangumiFolderName,
			collectionFolderMode: this.collectionFolderMode,
			collectionUnifiedName: this.collectionUnifiedName,
			timeFormat: this.timeFormat,
			multiPageUseSeasonStructure: this.multiPageUseSeasonStructure,
			collectionUseSeasonStructure: this.collectionUseSeasonStructure,
			bangumiUseSeasonStructure: this.bangumiUseSeasonStructure
		})
	);

	#previewTimer: ReturnType<typeof setTimeout> | null = null;
	#previewRequestId = 0;
	#lastSignature = '';

	/** 用配置接口的返回值填充命名表单 */
	applyFromConfig(config: ConfigResponse): void {
		this.videoName = config.video_name || '';
		this.pageName = config.page_name || '';
		this.multiPageName = config.multi_page_name || '';
		this.bangumiName = config.bangumi_name || '';
		this.folderStructure = config.folder_structure || '';
		this.bangumiFolderName = config.bangumi_folder_name || DEFAULT_BANGUMI_FOLDER_NAME;
		this.collectionFolderMode = config.collection_folder_mode || 'separate';
		this.collectionUnifiedName = config.collection_unified_name || this.collectionUnifiedName;
		this.timeFormat = config.time_format || '';
		this.nfoTimeType = config.nfo_time_type || 'favtime';
		this.nfoIncludeGenre = config.nfo_include_genre ?? true;
		this.multiPageUseSeasonStructure = config.multi_page_use_season_structure ?? false;
		this.collectionUseSeasonStructure = config.collection_use_season_structure ?? false;
		this.bangumiUseSeasonStructure = config.bangumi_use_season_structure ?? false;
		this.ready = true;
	}

	/** 保存主配置时提交的命名字段 */
	toPayload() {
		return {
			video_name: this.videoName,
			page_name: this.pageName,
			multi_page_name: this.multiPageName,
			bangumi_name: this.bangumiName,
			folder_structure: this.folderStructure,
			bangumi_folder_name: this.bangumiFolderName,
			collection_folder_mode: this.collectionFolderMode,
			collection_unified_name: this.collectionUnifiedName,
			time_format: this.timeFormat,
			nfo_time_type: this.nfoTimeType,
			nfo_include_genre: this.nfoIncludeGenre,
			multi_page_use_season_structure: this.multiPageUseSeasonStructure,
			collection_use_season_structure: this.collectionUseSeasonStructure,
			bangumi_use_season_structure: this.bangumiUseSeasonStructure
		};
	}

	/** 保存前校验命名模板；返回 false 时由页面弹错误提示 */
	validateAll(): boolean {
		return this.pageNameValid && this.multiPageNameValid && this.collectionUnifiedNameValid;
	}

	/** 第一个校验失败的提示文案（供页面统一提示） */
	get firstValidationError(): string {
		return this.pageNameError || this.multiPageNameError || this.collectionUnifiedNameError;
	}

	/** 视频文件名模板变更：若与多P模板同时带路径，自动去掉多P模板的路径部分 */
	handleVideoNameChange(value: string): void {
		if (hasPathSeparator(value) && hasPathSeparator(this.multiPageName)) {
			if (this.multiPageName.includes('/') || this.multiPageName.includes('\\')) {
				const parts = this.multiPageName.split(/[/\\]/);
				this.multiPageName = parts[parts.length - 1] || '{{title}}-P{{pid_pad}}';
				toast.info('已自动调整多P模板', {
					description: '移除了多P模板中的路径设置，避免冲突'
				});
			}
		}
	}

	/** 多P模板变更：与视频模板互斥处理 */
	handleMultiPageNameChange(value: string): void {
		if (hasPathSeparator(value) && hasPathSeparator(this.videoName)) {
			if (this.videoName.includes('/') || this.videoName.includes('\\')) {
				const parts = this.videoName.split(/[/\\]/);
				this.videoName = parts[parts.length - 1] || '{{title}}';
				toast.info('已自动调整视频模板', {
					description: '移除了视频模板中的路径设置，避免冲突'
				});
			}
		}
	}

	/**
	 * 页面在 $: 中调用：签名或抽屉开关变化时按需刷新预览。
	 * 只有抽屉打开且配置已加载时才请求，避免无意义的接口调用。
	 */
	refreshOnChange(signature: string, sheetOpen: boolean): void {
		if (!this.ready || !sheetOpen) return;
		if (signature === this.#lastSignature) return;
		this.#lastSignature = signature;
		this.#schedulePreview();
	}

	/** 手动触发一次预览（重试按钮等场景） */
	refreshPreview(): void {
		this.#schedulePreview();
	}

	#schedulePreview(): void {
		if (this.#previewTimer) {
			clearTimeout(this.#previewTimer);
		}
		this.#previewTimer = setTimeout(() => {
			void this.#loadPreview();
		}, PREVIEW_DEBOUNCE_MS);
	}

	async #loadPreview(): Promise<void> {
		if (!this.ready) return;

		const requestId = ++this.#previewRequestId;
		this.previewLoading = true;
		this.previewError = '';

		try {
			const response = await api.previewFilenameTemplates({
				video_name: this.videoName,
				page_name: this.pageName,
				multi_page_name: this.multiPageName,
				bangumi_name: this.bangumiName,
				folder_structure: this.folderStructure,
				bangumi_folder_name: this.bangumiFolderName,
				collection_folder_mode: this.collectionFolderMode,
				collection_unified_name: this.collectionUnifiedName,
				time_format: this.timeFormat,
				multi_page_use_season_structure: this.multiPageUseSeasonStructure,
				collection_use_season_structure: this.collectionUseSeasonStructure,
				bangumi_use_season_structure: this.bangumiUseSeasonStructure
			});
			if (requestId !== this.#previewRequestId) return;
			this.preview = response.data;
		} catch (error) {
			if (requestId !== this.#previewRequestId) return;
			this.preview = null;
			this.previewError = getRequestErrorMessage(error);
		} finally {
			if (requestId === this.#previewRequestId) {
				this.previewLoading = false;
			}
		}
	}

	/** 组件销毁时清理防抖定时器 */
	destroy(): void {
		if (this.#previewTimer) {
			clearTimeout(this.#previewTimer);
			this.#previewTimer = null;
		}
	}
}
