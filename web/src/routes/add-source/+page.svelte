<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteSet } from 'svelte/reactivity';
	import api from '$lib/api';
	import BatchCheckbox from '$lib/components/batch-checkbox.svelte';
	import BiliImage from '$lib/components/bili-image.svelte';
	import BatchActionBar from '$lib/components/add-source/batch-action-bar.svelte';
	import HoverDetailCard from '$lib/components/add-source/hover-detail-card.svelte';
	import { HoverTooltipStore } from '$lib/stores/add-source/hover.svelte';
	import { SubmissionSelectionStore } from '$lib/stores/add-source/submission.svelte';
	import { BatchSelectionStore } from '$lib/stores/add-source/batch.svelte';
	import { BangumiSeasonStore } from '$lib/stores/add-source/bangumi.svelte';
	import { PugvCourseStore } from '$lib/stores/add-source/pugv.svelte';
	import { SearchStore } from '$lib/stores/add-source/search.svelte';
	import { SourceOptionsStore } from '$lib/stores/add-source/source-options.svelte';
	import { QuickSubscriptionStore } from '$lib/stores/add-source/quick-subscription.svelte';
	import { KeywordFilterStore } from '$lib/stores/add-source/keyword-filter.svelte';
	import { SourceFormStore } from '$lib/stores/add-source/source-form.svelte';
	import BatchConfigDialog from '$lib/components/add-source/batch-config-dialog.svelte';
	import SubmissionSelectionPanel from '$lib/components/add-source/submission-selection-panel.svelte';
	import SearchResultsPanel from '$lib/components/add-source/search-results-panel.svelte';
	import FilterOptionEditor from '$lib/components/filter-option-editor.svelte';
	import { Button } from '$lib/components/ui/button';
	import EmptyState from '$lib/components/empty-state.svelte';
	import SectionHeader from '$lib/components/section-header.svelte';
	import SelectableCardButton from '$lib/components/selectable-card-button.svelte';
	import SidePanel from '$lib/components/side-panel.svelte';
	import SelectAllButton from '$lib/components/select-all-button.svelte';
	import Loading from '$lib/components/ui/Loading.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { CustomSelect } from '$lib/components/ui/select';
	import { setBreadcrumb } from '$lib/stores/breadcrumb';
	import type {
		SearchResultItem,
		VideoCategory,
		UserFavoriteFolder,
		UserCollectionItem,
		UserFollowing,
		ValidateFavoriteResponse,
		ConfigResponse,
		UserCollectionInfo,
		AddVideoSourceRequest,
		FilterOption,
		VideoQuality,
		AudioQuality,
		VideoCodec
	} from '$lib/types';
	import {
		Search,
		X,
		Plus as PlusIcon,
		Filter as FilterIcon,
		Info as InfoIcon,
		Languages as LanguagesIcon,
		SlidersHorizontal as SlidersHorizontalIcon
	} from '@lucide/svelte';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import { runRequest } from '$lib/utils/request.js';
	import { IsMobile, IsTablet } from '$lib/hooks/is-mobile.svelte.js';
	import { formatTimestamp } from '$lib/utils/timezone';
	import { formatSubmissionMetricLabel } from '$lib/utils/submission';

	const hover = new HoverTooltipStore();

	const submission = new SubmissionSelectionStore({
		getUpId: () => form.sourceId,
		getPlatform: () => sourcePlatform
	});

	const batch = new BatchSelectionStore({
		getSourceType: () => sourceType,
		getSelectedTemplate: () => batchSelectedTemplate,
		getQuickTemplate: (type) => quick.getTemplate(type),
		renderPath: (template, name) => quick.renderPath(template, name),
		getBaseParams: () => ({
			...options.toPayload()
		}),
		onBatchAdded: async () => {
			await runRequest(() => api.refreshScanning(), {
				showErrorToast: false,
				context: '触发立即扫描失败'
			});
			setTimeout(() => {
				goto(resolve('/video-sources'));
			}, 1000);
		},
		cleanTitle: (title) => cleanTitle(title),
		getFavoriteDisplayName: (item) => getFavoriteDisplayName(item)
	});

	const bangumi = new BangumiSeasonStore({
		getSourceId: () => form.sourceId,
		getSourceType: () => sourceType,
		isSeasonExists: (seasonId) => isBangumiSeasonExists(seasonId)
	});

	const pugv = new PugvCourseStore();

	const search = new SearchStore({
		getSourceType: () => sourceType,
		onBeforeSearch: () => {
			clearFollowingsPanel();
			if (sourceType === 'collection') {
				clearCollectionPanels();
			} else if (sourceType === 'favorite') {
				clearFavoritePanels();
			} else if (sourceType === 'submission') {
				submission.open = false;
			}
		}
	});

	const options = new SourceOptionsStore();
	const quick = new QuickSubscriptionStore();
	const filter = new KeywordFilterStore();
	const form = new SourceFormStore();

	const DEFAULT_AI_SUBTITLE_LANGUAGE = 'zh-CN';
	const AI_SUBTITLE_LANGUAGE_OPTIONS = [
		{ value: 'zh-CN', label: '中文' },
		{ value: 'zh-CN+en', label: '中文 + 英语（双语）' },
		{ value: 'en-US', label: '英语' },
		{ value: 'ja-JP', label: '日语' },
		{ value: 'ko-KR', label: '韩语' }
	];
	const VALID_VIDEO_QUALITIES = new Set<VideoQuality>([
		'Quality360p',
		'Quality480p',
		'Quality720p',
		'Quality1080p',
		'Quality1080pPLUS',
		'Quality1080p60',
		'Quality4k',
		'QualityHdr',
		'QualityDolby',
		'Quality8k'
	]);
	const VALID_AUDIO_QUALITIES = new Set<AudioQuality>([
		'Quality64k',
		'Quality132k',
		'QualityDolby',
		'QualityHiRES',
		'QualityDolbyBangumi',
		'Quality192k'
	]);
	const VALID_VIDEO_CODECS = new Set<VideoCodec>(['AVC', 'HEV', 'AV1']);
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

	let sourceType: VideoCategory = 'collection';
	const sourcePlatform = 'bilibili';
	let lastSourceType: VideoCategory = sourceType; // 记录上一次的源类型，用于检测切换
	let name = '';
	let path = '';
	let loading = false;

	// 下载选项
	let globalFilterOptionDefault: FilterOption = {
		...DEFAULT_FILTER_OPTION,
		codecs: [...DEFAULT_FILTER_OPTION.codecs]
	};
	// AI重命名高级选项

	// 添加手动输入标志

	function clearSearchPanel(options: { clearKeyword?: boolean } = {}) {
		search.clear(options);
		hover.hide();
	}

	function clearFollowingsPanel() {
		userFollowings = [];
	}

	function clearCollectionPanels() {
		userCollections = [];
		subscribedCollections = [];
	}

	function clearFavoritePanels() {
		userFavorites = [];
		clearSearchedUserFavoritesSelection();
	}

	// 收藏夹相关
	let userFavorites: UserFavoriteFolder[] = [];
	let loadingFavorites = false;
	let validatingFavorite = false;
	let favoriteValidationResult: ValidateFavoriteResponse | null = null;
	let favoriteValidationTimeout: ReturnType<typeof setTimeout> | null = null;

	// UP主收藏夹搜索相关
	let searchedUserFavorites: UserFavoriteFolder[] = [];
	let loadingSearchedUserFavorites = false;
	let selectedUserId: string = '';
	let selectedUserName: string = '';

	// UP主合集相关
	let userCollections: UserCollectionItem[] = [];
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let loadingCollections = false; // 合集加载状态
	let upIdTimeout: ReturnType<typeof setTimeout> | null = null;

	// 关注的UP主相关
	let userFollowings: UserFollowing[] = [];
	let loadingFollowings = false;

	let cachedNameBeforeMerge = '';
	let cachedPathBeforeMerge = '';
	let isUsingMergedSourceMeta = false;

	// 过滤已有视频源相关
	let existingCollectionIds: Set<string> = new SvelteSet();
	let existingFavoriteIds: Set<number> = new SvelteSet();
	let existingSubmissionIds: Set<number> = new SvelteSet();
	let existingBangumiSeasonIds: Set<string> = new SvelteSet();

	function getFavoriteDisplayName(favorite: Partial<UserFavoriteFolder> & { name?: string }) {
		return favorite.title || favorite.name || '未命名收藏夹';
	}

	// 悬停详情相关

	// 响应式相关
	const isMobileQuery = new IsMobile();
	const isTabletQuery = new IsTablet();
	let isMobile: boolean = false;
	let isTablet: boolean = false;
	let isCompactLayout: boolean = false;
	// eslint-disable-next-line svelte/no-immutable-reactive-statements -- isMobileQuery.current 是 MediaQuery 的响应式 getter（svelte/reactivity），规则看不到，属误报
	$: isMobile = isMobileQuery.current;
	// eslint-disable-next-line svelte/no-immutable-reactive-statements -- isTabletQuery.current 是 MediaQuery 的响应式 getter（svelte/reactivity），规则看不到，属误报
	$: isTablet = isTabletQuery.current;
	$: isCompactLayout = isMobile || isTablet;

	// 源类型选项
	const sourceTypeOptions = [
		{ value: 'collection', label: '合集', description: '视频合集，需要UP主ID和合集ID' },
		{
			value: 'favorite',
			label: '收藏夹',
			description: '可添加任何公开收藏夹，收藏夹ID可在收藏夹页面URL中获取'
		},
		{ value: 'submission', label: 'UP主投稿', description: 'UP主ID可在UP主空间URL中获取' },
		{ value: 'watch_later', label: '稍后观看', description: '同步稍后观看列表' },
		{ value: 'bangumi', label: '番剧', description: '番剧season_id可在番剧页面URL中获取' },
		{
			value: 'pugv',
			label: '课程',
			description:
				'B站课程（含付费课）。season_id 在课程链接 cheese/play/ss 后面，可直接粘贴整条链接'
		}
	];

	// 合集类型选项
	const collectionTypeOptions = [
		{ value: 'season', label: '合集', description: 'B站标准合集' },
		{ value: 'series', label: '系列', description: '视频系列' }
	];

	// 课程：允许直接粘贴整条链接，自动抽出 season_id
	function normalizePugvSeasonId(raw: string): string {
		const text = raw.trim();
		if (!text) return '';
		const matched =
			text.match(/cheese\/play\/ss(\d+)/i) ?? text.match(/\bss(\d+)\b/i) ?? text.match(/^(\d+)$/);
		return matched ? matched[1] : text;
	}

	$: currentQuickSubscriptionType = sourceType;
	$: currentQuickSubscriptionTemplate =
		currentQuickSubscriptionType === 'favorite'
			? quick.favorite.trim()
			: currentQuickSubscriptionType === 'collection'
				? quick.collection.trim()
				: currentQuickSubscriptionType === 'submission'
					? quick.submission.trim()
					: currentQuickSubscriptionType === 'bangumi'
						? quick.bangumi.trim()
						: currentQuickSubscriptionType === 'pugv'
							? quick.pugv.trim()
							: '';

	function buildDownloadFilePathPreview(): string {
		const root = path.trim().replace(/[\\/]+$/, '');
		if (!root) return '';
		const separator = root.includes('\\') ? '\\' : '/';
		if (sourceType === 'collection') {
			return `${root}${separator}Season 01${separator}S01E01 - 示例标题.mp4`;
		}
		return '';
	}

	// eslint-disable-next-line svelte/no-immutable-reactive-statements -- 函数内部读取了 $state 变量，规则不追踪函数体，属误报
	$: downloadFilePathPreview = buildDownloadFilePathPreview();

	function applyQuickSubscriptionPath(
		type: VideoCategory,
		sourceName: string,
		force = false
	): boolean {
		if (bangumi.isMerging) return false;

		const template = quick.getTemplate(type).trim();
		if (!template || !sourceName.trim()) return false;
		if (!force && path.trim() && path !== quick.lastAutoAppliedPath) return false;

		const nextPath = quick.renderPath(template, sourceName).trim();
		if (!nextPath) return false;

		path = nextPath;
		quick.lastAutoAppliedPath = nextPath;
		return true;
	}

	function handleNameInput() {
		applyQuickSubscriptionPath(currentQuickSubscriptionType, name, false);
	}

	async function loadQuickSubscriptionTemplates() {
		const response = await runRequest(() => api.getConfig(), {
			showErrorToast: false,
			context: '加载快捷订阅路径模板失败'
		});
		if (!response) return;

		const config: ConfigResponse = response.data;
		quick.applyFromConfig(config);
		globalFilterOptionDefault = filterOptionFromConfig(config);
		if (options.filterOptionInheritGlobal) {
			options.resetFilterDraft(globalFilterOptionDefault);
		}
	}

	function cloneFilterOption(option: FilterOption): FilterOption {
		return {
			...option,
			codecs: [...option.codecs]
		};
	}

	function normalizeVideoQuality(value: string | undefined, fallback: VideoQuality): VideoQuality {
		return value && VALID_VIDEO_QUALITIES.has(value as VideoQuality)
			? (value as VideoQuality)
			: fallback;
	}

	function normalizeAudioQuality(value: string | undefined, fallback: AudioQuality): AudioQuality {
		return value && VALID_AUDIO_QUALITIES.has(value as AudioQuality)
			? (value as AudioQuality)
			: fallback;
	}

	function normalizeVideoCodecs(values: string[] | undefined): VideoCodec[] {
		const codecs = values?.filter((codec): codec is VideoCodec =>
			VALID_VIDEO_CODECS.has(codec as VideoCodec)
		);
		return codecs && codecs.length > 0 ? codecs : [...DEFAULT_FILTER_OPTION.codecs];
	}

	function filterOptionFromConfig(config: ConfigResponse): FilterOption {
		return {
			video_max_quality: normalizeVideoQuality(
				config.video_max_quality,
				DEFAULT_FILTER_OPTION.video_max_quality
			),
			video_min_quality: normalizeVideoQuality(
				config.video_min_quality,
				DEFAULT_FILTER_OPTION.video_min_quality
			),
			audio_max_quality: normalizeAudioQuality(
				config.audio_max_quality,
				DEFAULT_FILTER_OPTION.audio_max_quality
			),
			audio_min_quality: normalizeAudioQuality(
				config.audio_min_quality,
				DEFAULT_FILTER_OPTION.audio_min_quality
			),
			codecs: normalizeVideoCodecs(config.codecs),
			no_dolby_video: config.no_dolby_video ?? DEFAULT_FILTER_OPTION.no_dolby_video,
			no_dolby_audio: config.no_dolby_audio ?? DEFAULT_FILTER_OPTION.no_dolby_audio,
			no_hdr: config.no_hdr ?? DEFAULT_FILTER_OPTION.no_hdr,
			no_hires: config.no_hires ?? DEFAULT_FILTER_OPTION.no_hires
		};
	}

	// 订阅的合集相关
	let subscribedCollections: UserCollectionInfo[] = [];
	let loadingSubscribedCollections = false;

	onMount(async () => {
		setBreadcrumb([
			{ label: '主页', href: '/' },
			{ label: '添加视频源', isActive: true }
		]);
		await Promise.all([loadExistingVideoSources(), loadQuickSubscriptionTemplates()]);
	});

	onDestroy(() => {
		// 清理定时器
		hover.destroy();
		submission.destroy();
		bangumi.destroy();
		if (upIdTimeout) clearTimeout(upIdTimeout);
		if (favoriteValidationTimeout) clearTimeout(favoriteValidationTimeout);
	});

	$: {
		if (bangumi.isMerging) {
			const targetSource = bangumi.existingSources.find(
				(source) => source.id === bangumi.mergeToSourceId
			);
			if (targetSource) {
				if (!isUsingMergedSourceMeta) {
					cachedNameBeforeMerge = name;
					cachedPathBeforeMerge = path;
				}
				name = targetSource.name;
				path = targetSource.path;
				isUsingMergedSourceMeta = true;
			}
		} else if (isUsingMergedSourceMeta) {
			name = cachedNameBeforeMerge;
			path = cachedPathBeforeMerge;
			isUsingMergedSourceMeta = false;
		}
	}

	// 搜索B站内容
	async function handleSearch(overrideSearchType?: string) {
		await search.search(overrideSearchType);
	}

	// 选择搜索结果
	function selectSearchResult(result: SearchResultItem) {
		clearFollowingsPanel();

		switch (sourceType) {
			case 'collection':
				if (result.mid) {
					clearCollectionPanels();
					form.upId = result.mid.toString();
					// 触发获取UP主合集列表
					handleUpIdChange();
					toast.success('已填充UP主信息', { description: '正在获取合集列表...' });
				}
				break;
			case 'submission':
				if (result.mid) {
					form.sourceId = result.mid.toString();
					name = cleanTitle(result.title);
					submission.selectedUpName = cleanTitle(result.title);
					applyQuickSubscriptionPath('submission', name, true);
					// 打开投稿选择对话框
					submission.open = true;
				}
				break;
			case 'bangumi':
				if (result.season_id) {
					form.sourceId = result.season_id;
					name = cleanTitle(result.title);
					applyQuickSubscriptionPath('bangumi', name, true);
				}
				break;
			case 'pugv':
				// 课程：先选讲师（UP 主），随后列出该讲师名下所有课程供勾选
				if (result.mid) {
					pugv.upMid = result.mid.toString();
					pugv.upName = cleanTitle(result.title);
					pugv.courses = [];
					pugv.selectedSeasonIds = [];
					pugv.fetchAttempted = false;
					name = pugv.upName;
					applyQuickSubscriptionPath('pugv', name, true);
					void pugv.fetchCourses();
					toast.success('已选择UP主', { description: '正在获取该UP主的课程列表…' });
				}
				break;
			case 'favorite':
				// 收藏夹类型搜索UP主，调用获取收藏夹函数
				if (result.mid) {
					selectUserAndFetchFavorites(result);
					return; // 直接返回，不执行后续逻辑
				}
				break;
			default:
				if (result.bvid) {
					form.sourceId = result.bvid;
					name = cleanTitle(result.title);
				}
				break;
		}

		// 关闭搜索结果
		clearSearchPanel({ clearKeyword: true });

		if (sourceType !== 'collection') {
			toast.success('已填充信息', { description: '请检查并完善其他必要信息' });
		}
	}

	// 清理标题中的HTML标签
	function cleanTitle(title: string): string {
		const div = document.createElement('div');
		div.innerHTML = title;
		return div.textContent || div.innerText || title;
	}

	async function handleSubmit() {
		filter.advancedError = '';

		let parsedMinDuration: number | null = null;
		let parsedMaxDuration: number | null = null;
		try {
			({ min: parsedMinDuration, max: parsedMaxDuration } = filter.parseDurations());
		} catch (error) {
			toast.error('过滤条件无效', { description: (error as Error).message });
			filter.advancedError = (error as Error).message;
			return;
		}

		if (
			parsedMinDuration !== null &&
			parsedMaxDuration !== null &&
			parsedMinDuration > parsedMaxDuration
		) {
			filter.advancedError = '最短时长不能大于最长时长';
			toast.error('过滤条件无效', { description: filter.advancedError });
			return;
		}

		if (
			filter.publishedAfter &&
			filter.publishedBefore &&
			filter.publishedAfter > filter.publishedBefore
		) {
			filter.advancedError = '投稿起始日期不能晚于投稿截止日期';
			toast.error('过滤条件无效', { description: filter.advancedError });
			return;
		}

		// 验证表单
		const isPugvUpFlow = sourceType === 'pugv' && !!(pugv.upMid && pugv.courses.length > 0);
		if (sourceType !== 'watch_later' && !form.sourceId && !isPugvUpFlow) {
			toast.error('请输入ID', { description: '视频源ID不能为空' });
			return;
		}

		if (sourceType === 'collection' && !form.upId) {
			toast.error('请输入UP主ID', { description: '合集需要提供UP主ID' });
			return;
		}

		if (!name) {
			toast.error('请输入名称', { description: '视频源名称不能为空' });
			return;
		}

		if (!path) {
			toast.error('请输入保存路径', { description: '保存路径不能为空' });
			return;
		}

		if (!options.filterOptionInheritGlobal && options.filterOptionDraft.codecs.length === 0) {
			toast.error('码率设置无效', { description: '至少保留一个编解码器' });
			return;
		}

		// 番剧特殊验证
		if (sourceType === 'bangumi') {
			// 如果不是下载全部季度，且没有选择任何季度，且不是单季度情况，则提示错误
			if (!form.downloadAllSeasons && bangumi.selected.length === 0 && bangumi.seasons.length > 1) {
				toast.error('请选择要下载的季度', {
					description: '未选择"下载全部季度"时，至少需要选择一个季度'
				});
				return;
			}
		}

		const params: AddVideoSourceRequest = {
			source_type: sourceType,
			source_id: form.sourceId,
			name,
			path,
			// 下载选项
			...options.toPayload()
		};

		if (sourceType === 'collection') {
			params.up_id = form.upId;
			params.collection_type = form.collectionType;
			params.collection_aggregate_enabled = form.collectionAggregateEnabled;
			if (form.cover) {
				params.cover = form.cover;
			}
		}

		if (sourceType === 'bangumi') {
			params.download_all_seasons = form.downloadAllSeasons;
			// 如果选择了特定季度，添加selected_seasons参数
			if (bangumi.selected.length > 0 && !form.downloadAllSeasons) {
				params.selected_seasons = bangumi.selected;
			}
			// 如果选择了合并到现有番剧源，添加merge_to_source_id参数
			if (bangumi.mergeToSourceId) {
				params.merge_to_source_id = bangumi.mergeToSourceId;
			}
		}

		if (sourceType === 'submission') {
			// 如果有选择的视频，添加selected_videos参数
			if (submission.selectedVideos.length > 0) {
				params.selected_videos = submission.selectedVideos;
			}
		}

		// 如果有关键词过滤器，添加blacklist_keywords和whitelist_keywords参数（双列表模式）
		// 注意：后端API仍使用keyword_filters和keyword_filter_mode，但会被转换为新格式
		// 为了向后兼容，在添加时使用旧格式，后端会自动处理
		if (filter.blacklist.length > 0 || filter.whitelist.length > 0) {
			// 使用新的双列表模式，直接传递两个列表
			// 后端handler会根据是否存在这些字段来决定使用哪种模式
			if (filter.blacklist.length > 0) {
				params.keyword_filters = filter.blacklist;
				params.keyword_filter_mode = 'blacklist';
			}
			// 注意：当前添加接口只支持单一模式，双列表需要后续通过编辑接口设置
			// 如果同时有白名单，需要先添加视频源，然后再通过关键词过滤器编辑功能设置完整的双列表
		}

		// 课程：勾选的每门课各自作为一个视频源；未勾选则添加该讲师名下的全部课程
		if (isPugvUpFlow) {
			const targets =
				pugv.selectedSeasonIds.length > 0
					? pugv.courses.filter((course) => pugv.selectedSeasonIds.includes(course.season_id))
					: pugv.courses;

			const summary = await runRequest(
				async () => {
					let added = 0;
					const failed: string[] = [];
					for (const course of targets) {
						if (pugv.existingSeasonIds.has(course.season_id)) continue;
						try {
							const addedResult = await api.addVideoSource({
								...params,
								source_id: course.season_id,
								name: course.title
							});
							if (addedResult.data.success) {
								added += 1;
								if (filter.hasAdvancedFilters() && addedResult.data.source_id) {
									try {
										await api.updateVideoSourceKeywordFilters(
											sourceType,
											addedResult.data.source_id,
											filter.blacklist,
											filter.whitelist,
											filter.caseSensitive,
											parsedMinDuration,
											parsedMaxDuration,
											filter.publishedAfter,
											filter.publishedBefore
										);
									} catch (e) {
										console.warn('更新课程关键词过滤器失败:', e);
									}
								}
							} else {
								failed.push(`${course.title}：${addedResult.data.message}`);
							}
						} catch (error) {
							console.error('添加课程失败:', course.title, error);
							failed.push(course.title);
						}
					}
					return { added, failed };
				},
				{
					setLoading: (value) => (loading = value),
					context: '批量添加课程失败'
				}
			);
			if (!summary) return;

			const { added, failed } = summary;
			if (added > 0) {
				toast.success(`已添加 ${added} 门课程`, {
					description:
						failed.length > 0 ? `另有 ${failed.length} 门失败：${failed[0]}` : '可在视频源页查看'
				});
				goto(resolve('/video-sources'));
			} else if (failed.length > 0) {
				toast.error('添加课程失败', { description: failed[0] });
			} else {
				toast.warning('没有需要添加的课程', { description: '所选课程都已经添加过了' });
			}
			return;
		}

		const result = await runRequest(
			async () => {
				const result = await api.addVideoSource(params);

				if (result.data.success) {
					if (filter.hasAdvancedFilters() && result.data.source_id) {
						try {
							await api.updateVideoSourceKeywordFilters(
								sourceType,
								result.data.source_id,
								filter.blacklist,
								filter.whitelist,
								filter.caseSensitive,
								parsedMinDuration,
								parsedMaxDuration,
								filter.publishedAfter,
								filter.publishedBefore
							);
						} catch (e) {
							console.warn('更新关键词过滤器失败:', e);
						}
					}
				}

				return result;
			},
			{
				setLoading: (value) => (loading = value),
				context: '添加视频源失败',
				showErrorToast: false,
				onError: (error) => {
					console.error('添加视频源失败:', error);

					const errorMessage =
						error && typeof error === 'object' && 'message' in error
							? String(error.message)
							: error instanceof Error
								? error.message
								: '添加视频源失败';
					let errorDescription = '';

					if (errorMessage.includes('已存在')) {
						// 重复添加错误
						if (sourceType === 'bangumi') {
							errorDescription =
								'该番剧已经添加过了，请检查是否使用了相同的Season ID、Media ID或Episode ID';
						} else if (sourceType === 'pugv') {
							errorDescription = '该课程已经添加过了，请检查是否使用了相同的课程 Season ID';
						} else if (sourceType === 'collection') {
							errorDescription = '该合集已经添加过了，请检查是否使用了相同的合集ID和UP主ID';
						} else if (sourceType === 'favorite') {
							errorDescription = '该收藏夹已经添加过了，请检查是否使用了相同的收藏夹ID';
						} else if (sourceType === 'submission') {
							errorDescription = '该UP主的投稿已经添加过了，请检查是否使用了相同的UP主ID';
						} else if (sourceType === 'watch_later') {
							errorDescription = '稍后观看只能配置一个，请先删除现有配置';
						}

						toast.error('重复添加', {
							description: errorDescription,
							duration: 5000 // 延长显示时间
						});
					} else {
						// 其他错误
						toast.error('添加失败', { description: errorMessage });
					}
				}
			}
		);
		if (!result) return;

		if (result.data.success) {
			toast.success('添加成功', { description: result.data.message });
			// 重置表单
			form.sourceId = '';
			form.upId = '';
			name = '';
			path = '/Downloads';
			quick.lastAutoAppliedPath = '';
			form.downloadAllSeasons = false;
			form.collectionType = 'season';
			form.collectionAggregateEnabled = false;
			form.isManualInput = false;
			bangumi.seasons = [];
			bangumi.selected = [];
			submission.selectedVideos = [];
			submission.selectedUpName = '';
			bangumi.mergeToSourceId = null;
			bangumi.existingSources = [];
			filter.blacklist = [];
			filter.whitelist = [];
			filter.newBlacklist = '';
			filter.newWhitelist = '';
			filter.caseSensitive = true;
			filter.minDuration = '';
			filter.maxDuration = '';
			filter.publishedAfter = '';
			filter.publishedBefore = '';
			filter.advancedError = '';
			filter.showSection = false;
			// 重置下载选项
			options.audioOnly = false;
			options.audioOnlyM4aOnly = false;
			options.flatFolder = false;
			options.splitChaptersAfterDownload = false;
			options.downloadChargeVideos = true;
			options.downloadDanmaku = true;
			options.downloadSubtitle = true;
			options.downloadAiSubtitle = true;
			options.aiSubtitleLanguage = DEFAULT_AI_SUBTITLE_LANGUAGE;
			options.filterOptionInheritGlobal = true;
			options.filterOptionDraft = cloneFilterOption(globalFilterOptionDefault);
			options.useDynamicApi = false;
			options.aiRename = false;
			options.aiRenameVideoPrompt = '';
			options.aiRenameAudioPrompt = '';
			options.showAiRenameAdvanced = false;
			options.aiRenameEnableMultiPage = false;
			options.aiRenameEnableCollection = false;
			options.aiRenameEnableBangumi = false;
			options.aiRenameRenameParentDir = false;
			// 跳转到视频源管理页面
			goto(resolve('/video-sources'));
		} else {
			toast.error('添加失败', { description: result.data.message });
		}
	}

	// 根据类型显示不同的描述
	$: currentTypeDescription =
		sourceTypeOptions.find((opt) => opt.value === sourceType)?.description || '';

	// 获取收藏夹列表
	async function fetchUserFavorites() {
		clearSearchPanel();
		clearFollowingsPanel();
		clearCollectionPanels();
		clearSearchedUserFavoritesSelection();

		const result = await runRequest(() => api.getUserFavorites(), {
			setLoading: (value) => (loadingFavorites = value),
			context: '获取收藏夹失败'
		});
		if (!result) return;

		if (result.data) {
			userFavorites = result.data;
			toast.success('获取收藏夹成功', {
				description: `共获取到 ${userFavorites.length} 个收藏夹`
			});
		} else {
			toast.error('获取收藏夹失败');
		}
	}

	// 选择收藏夹
	function selectFavorite(favorite: UserFavoriteFolder) {
		// 检查收藏夹是否已存在
		if (isFavoriteExists(favorite.id)) {
			toast.error('收藏夹已存在', {
				description: `该收藏夹「${getFavoriteDisplayName(favorite)}」已经添加过了`
			});
			return;
		}

		const favoriteName = getFavoriteDisplayName(favorite);
		if (!favoriteName) {
			toast.error('无法选择收藏夹', { description: '收藏夹缺少标题' });
			return;
		}

		form.sourceId = favorite.id.toString();
		name = favoriteName;
		applyQuickSubscriptionPath('favorite', name, true);
		favoriteValidationResult = {
			valid: true,
			fid: Number(favorite.id),
			title: favoriteName,
			message: '收藏夹验证成功'
		};
		clearFavoritePanels();
		toast.success('已选择收藏夹', { description: name });
	}

	// 选择搜索到的收藏夹
	function selectSearchedFavorite(favorite: UserFavoriteFolder) {
		// 检查收藏夹是否已存在（使用完整ID）
		if (isFavoriteExists(favorite.id)) {
			toast.error('收藏夹已存在', {
				description: `该收藏夹「${favorite.title}」已经添加过了`
			});
			return;
		}

		if (!favorite.title) {
			toast.error('无法选择收藏夹', { description: '收藏夹缺少标题' });
			return;
		}

		// 使用完整ID（id字段），而不是短ID（fid字段）
		form.sourceId = favorite.id.toString();
		name = favorite.title;
		applyQuickSubscriptionPath('favorite', name, true);
		favoriteValidationResult = {
			valid: true,
			fid: Number(favorite.id),
			title: favorite.title,
			message: '收藏夹验证成功'
		};
		clearFavoritePanels();
		toast.success('已选择收藏夹', { description: name });
	}

	// 选择UP主并获取其收藏夹
	async function selectUserAndFetchFavorites(user: SearchResultItem) {
		clearFollowingsPanel();
		userFavorites = [];
		clearCollectionPanels();

		if (!user.mid) {
			toast.error('获取收藏夹失败', { description: '未找到 UP 主 ID' });
			return;
		}
		selectedUserId = user.mid.toString();
		selectedUserName = user.title; // 使用搜索结果中的title

		searchedUserFavorites = [];

		// 关闭搜索结果
		clearSearchPanel({ clearKeyword: true });

		const result = await runRequest(() => api.getUserFavoritesByUid(selectedUserId), {
			setLoading: (value) => (loadingSearchedUserFavorites = value),
			context: '获取UP主收藏夹失败',
			showErrorToast: false,
			onError: () => {
				toast.error('获取收藏夹失败', {
					description: 'UP主可能没有公开收藏夹或网络错误'
				});
			}
		});
		if (!result) return;

		if (result.data && result.data.length > 0) {
			searchedUserFavorites = result.data;
			toast.success('获取收藏夹成功', {
				description: `从 ${selectedUserName} 获取到 ${searchedUserFavorites.length} 个收藏夹`
			});
		} else {
			toast.info('该UP主没有公开收藏夹');
		}
	}

	function clearSearchedUserFavoritesSelection() {
		selectedUserId = '';
		selectedUserName = '';
		searchedUserFavorites = [];
		loadingSearchedUserFavorites = false;
	}

	// 验证收藏夹ID
	async function validateFavoriteId(fid: string) {
		if (!fid.trim()) {
			favoriteValidationResult = null;
			return;
		}

		// 检查是否为纯数字
		if (!/^\d+$/.test(fid.trim())) {
			favoriteValidationResult = {
				valid: false,
				fid: 0,
				title: '',
				message: '收藏夹ID必须为纯数字'
			};
			return;
		}

		validatingFavorite = true;
		favoriteValidationResult = null;

		const result = await runRequest(() => api.validateFavorite(fid.trim()), {
			setLoading: (value) => (validatingFavorite = value),
			showErrorToast: false,
			onError: () => {
				favoriteValidationResult = {
					valid: false,
					fid: parseInt(fid) || 0,
					title: '',
					message: '验证失败：网络错误或收藏夹不存在'
				};
			}
		});
		if (!result) return;

		favoriteValidationResult = result.data;

		if (result.data.valid && !name) {
			// 如果验证成功且用户还没有填写名称，自动填入收藏夹标题
			name = result.data.title;
			applyQuickSubscriptionPath('favorite', name, false);
		}
	}

	// 处理收藏夹ID变化
	function handleFavoriteIdChange() {
		if (favoriteValidationTimeout) clearTimeout(favoriteValidationTimeout);
		if (sourceType === 'favorite' && form.sourceId.trim()) {
			favoriteValidationTimeout = setTimeout(() => {
				validateFavoriteId(form.sourceId);
			}, 500);
		} else {
			favoriteValidationResult = null;
		}
	}

	// 处理UP主ID变化
	function handleUpIdChange() {
		if (upIdTimeout) clearTimeout(upIdTimeout);
		if (form.upId.trim()) {
			subscribedCollections = [];
			upIdTimeout = setTimeout(() => {
				fetchUserCollections();
			}, 500);
		} else {
			clearCollectionPanels();
		}
	}

	// 获取UP主合集列表
	async function fetchUserCollections() {
		if (!form.upId.trim()) return;
		clearSearchPanel();
		clearFollowingsPanel();
		subscribedCollections = [];

		const result = await runRequest(() => api.getUserCollections(form.upId), {
			setLoading: (value) => (loadingCollections = value),
			context: '获取合集列表失败',
			showErrorToast: false,
			onError: (error) => {
				// 根据错误类型提供更友好的提示
				const errorMsg =
					error && typeof error === 'object' && 'message' in error
						? String(error.message)
						: error instanceof Error
							? error.message
							: '';

				let errorDescription = '';

				if (errorMsg === 'Failed to fetch' || errorMsg.includes('ERR_EMPTY_RESPONSE')) {
					errorDescription = '该UP主的合集可能需要登录访问，或暂时无法获取';
				} else if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
					errorDescription = '该UP主的合集为私有，无法访问';
				} else if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
					errorDescription = 'UP主不存在或合集已被删除';
				} else {
					errorDescription = '网络错误或服务暂时不可用，请稍后重试';
				}

				toast.error('获取合集列表失败', { description: errorDescription });
				userCollections = [];
			}
		});
		if (!result) return;

		if (result.data && result.data.collections) {
			userCollections = result.data.collections;
			if (userCollections.length === 0) {
				toast.info('该UP主暂无合集');
			} else {
				toast.success('获取合集列表成功', {
					description: `共获取到 ${userCollections.length} 个合集`
				});
			}
		} else {
			toast.error('获取合集列表失败');
			userCollections = [];
		}
	}

	// 选择合集
	function selectCollection(collection: UserCollectionItem) {
		// 检查合集是否已存在
		if (isCollectionExists(collection.sid, collection.mid.toString(), collection.collection_type)) {
			toast.error('合集已存在', {
				description: `该合集「${collection.name}」已经添加过了`
			});
			return;
		}

		form.sourceId = collection.sid;
		name = collection.name;
		applyQuickSubscriptionPath('collection', name, true);
		form.cover = collection.cover || '';
		form.collectionType = collection.collection_type;
		form.isManualInput = false; // 从列表选择，不是手动输入
		clearSearchPanel();
		clearFollowingsPanel();
		clearCollectionPanels();
		toast.success('已选择合集', {
			description: `${collection.collection_type === 'season' ? '合集' : '系列'}：${collection.name}`
		});
	}

	// 处理Season ID变化
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function handleSeasonIdChange() {
		bangumi.handleSeasonIdChange();
	}

	// 加载已有视频源（用于过滤）
	async function loadExistingVideoSources() {
		const result = await runRequest(() => api.getVideoSources(), {
			context: '加载已有视频源失败'
		});
		if (!result?.data) return;

		// 处理合集：存储 s_id_m_id_type 的组合
		existingCollectionIds.clear();
		result.data.collection?.forEach((c) => {
			if (c.s_id && c.m_id) {
				const key = buildCollectionIdentityKey(c.s_id, c.m_id, c.collection_type);
				existingCollectionIds.add(key);
			}
		});

		// 处理收藏夹
		existingFavoriteIds.clear();
		result.data.favorite?.forEach((f) => {
			if (f.f_id) {
				existingFavoriteIds.add(f.f_id);
			}
		});

		// 处理UP主投稿
		existingSubmissionIds.clear();
		result.data.submission?.forEach((s) => {
			if (s.upper_id) {
				existingSubmissionIds.add(s.upper_id);
			}
		});

		// 处理番剧（主季度ID + 已选择的季度ID）
		existingBangumiSeasonIds.clear();
		result.data.bangumi?.forEach((b) => {
			if (b.season_id) {
				existingBangumiSeasonIds.add(b.season_id.toString());
			}
			// 如果有已选择的季度，也加入到过滤列表中
			if (b.selected_seasons) {
				try {
					// 检查 selected_seasons 是字符串还是已经解析的数组
					let parsedSeasons;
					if (typeof b.selected_seasons === 'string') {
						parsedSeasons = JSON.parse(b.selected_seasons);
					} else {
						parsedSeasons = b.selected_seasons;
					}

					if (Array.isArray(parsedSeasons)) {
						parsedSeasons.forEach((seasonId) => {
							// 确保统一转换为字符串进行比较
							const seasonIdStr = seasonId.toString();
							existingBangumiSeasonIds.add(seasonIdStr);
						});
					}
				} catch (e) {
					console.warn('解析selected_seasons失败:', b.selected_seasons, e);
				}
			}
		});

		// 处理课程（每门课程一个源，按 season_id 去重）
		pugv.existingSeasonIds = new SvelteSet(
			(result.data.pugv ?? [])
				.map((p) => (p.season_id ? p.season_id.toString() : ''))
				.filter((seasonId) => seasonId.length > 0)
		);
	}

	function normalizeCollectionType(collectionType?: string): string {
		return collectionType === 'series' ? 'series' : 'season';
	}

	function buildCollectionIdentityKey(
		sId: string | number,
		mId: string | number,
		collectionType?: string
	): string {
		return `${sId}_${mId}_${normalizeCollectionType(collectionType)}`;
	}

	// 检查合集是否已存在
	function isCollectionExists(sId: string, mId: string, collectionType?: string): boolean {
		const key = buildCollectionIdentityKey(sId, mId, collectionType);
		return existingCollectionIds.has(key);
	}

	// 检查UP主投稿是否已存在
	function isSubmissionExists(upperId: number): boolean {
		return existingSubmissionIds.has(upperId);
	}

	// 检查收藏夹是否已存在
	function isFavoriteExists(fId: number | string): boolean {
		const favoriteId = typeof fId === 'string' ? Number.parseInt(fId, 10) : fId;
		if (!Number.isFinite(favoriteId)) return false;
		return existingFavoriteIds.has(favoriteId);
	}

	// 检查番剧季度是否已存在
	function isBangumiSeasonExists(seasonId: string): boolean {
		return existingBangumiSeasonIds.has(seasonId.toString());
	}

	// 过滤后的收藏夹列表（不完全过滤，而是标记已存在状态）
	$: filteredUserFavorites = userFavorites;

	$: filteredSearchedUserFavorites = searchedUserFavorites;

	// 过滤后的合集列表（不完全过滤，而是标记已存在状态）
	$: filteredUserCollections = userCollections;

	// 过滤后的关注UP主列表（不完全过滤，而是标记已存在状态）
	$: filteredUserFollowings = userFollowings;

	// 过滤后的搜索结果（根据类型过滤已存在的源）
	$: filteredSearchResults = search.results.filter((result) => {
		if (sourceType === 'submission' && result.mid) {
			return !existingSubmissionIds.has(Number(result.mid));
		}
		// 对于番剧和合集搜索，不完全过滤，显示所有结果但标记已存在状态
		return true;
	});

	// 过滤后的番剧季度列表（标记已存在的季度）
	$: filteredBangumiSeasons = bangumi.seasons.map((season) => ({
		...season,
		isExisting: isBangumiSeasonExists(season.season_id)
	}));

	// 大列表/移动端禁用逐项动画，避免卡顿
	let enableSearchAnimations = true;
	let enableSeasonAnimations = true;

	$: enableSearchAnimations = !isMobile && filteredSearchResults.length <= 60;
	$: enableSeasonAnimations = !isMobile && filteredBangumiSeasons.length <= 40;

	// 监听sourceType变化，清理季度相关状态
	$: if (sourceType !== 'bangumi') {
		bangumi.fetchAttempted = false;
		bangumi.seasons = [];
		bangumi.selected = [];
		bangumi.mergeToSourceId = null;
	}

	// 当源类型改为番剧时，获取现有番剧源列表
	$: if (sourceType === 'bangumi') {
		bangumi.fetchExistingSources();
	}

	// 监听sourceType变化，重置手动输入标志和清空所有缓存
	$: if (sourceType) {
		form.isManualInput = false;
		quick.lastAutoAppliedPath = '';
		// 清空搜索相关状态
		search.results = [];
		search.keyword = '';
		search.total = 0;
		search.open = false;
		hover.hide();
		// 清空各类型的缓存数据
		userFollowings = [];
		userCollections = [];
		userFavorites = [];
		subscribedCollections = [];
		// 清空UP主收藏夹搜索状态
		searchedUserFavorites = [];
		selectedUserId = '';
		selectedUserName = '';
		loadingSearchedUserFavorites = false;
		// 注意：bangumi.seasons 和 bangumi.selected 在另一个响应式语句中处理
	}

	// 监听 source_id 变化，自动获取季度信息
	$: if (sourceType === 'bangumi' && form.sourceId) {
		bangumi.fetchSeasons();
	}

	// 切换源类型时，如处于批量模式且已有选择，则清空选择防止跨源类型
	$: if (sourceType !== lastSourceType) {
		batch.onSourceTypeChanged();
		lastSourceType = sourceType;
	}

	// 统一的悬浮处理函数

	// 获取关注的UP主列表
	async function fetchUserFollowings() {
		clearSearchPanel();

		const result = await runRequest(() => api.getUserFollowings(), {
			setLoading: (value) => (loadingFollowings = value),
			context: '获取关注UP主失败'
		});
		if (!result) return;

		if (result.data) {
			userFollowings = result.data;
			toast.success('获取关注UP主成功', {
				description: `共获取到 ${userFollowings.length} 个UP主`
			});
		} else {
			toast.error('获取关注UP主失败');
		}
	}

	// 选择关注的UP主
	function selectFollowing(following: UserFollowing) {
		clearSearchPanel();

		switch (sourceType) {
			case 'collection':
				form.upId = following.mid.toString();
				// 触发获取UP主合集列表
				handleUpIdChange();
				toast.success('已填充UP主信息', { description: '正在获取合集列表...' });
				break;
			case 'submission':
				form.sourceId = following.mid.toString();
				name = following.name;
				submission.selectedUpName = following.name;
				applyQuickSubscriptionPath('submission', name, true);
				// 打开投稿选择对话框
				submission.open = true;
				toast.success('已填充UP主信息');
				break;
		}

		// 清空关注UP主列表状态，关闭面板
		userFollowings = [];
	}

	// 获取关注的收藏夹列表
	async function fetchSubscribedCollections() {
		clearSearchPanel();
		clearFollowingsPanel();
		userCollections = [];

		const result = await runRequest(() => api.getSubscribedCollections(), {
			setLoading: (value) => (loadingSubscribedCollections = value),
			context: '获取关注的合集失败'
		});
		if (!result) return;

		if (result.data) {
			subscribedCollections = result.data;
			if (subscribedCollections.length === 0) {
				toast.info('暂无关注的合集', {
					description: '您还没有关注任何合集。关注合集后可以在这里快速选择添加。',
					duration: 5000
				});
			} else {
				toast.success('获取关注的合集成功', {
					description: `共获取到 ${subscribedCollections.length} 个您关注的合集`
				});
			}
		} else {
			toast.error('获取合集失败');
		}
	}

	// 选择订阅的合集或收藏夹
	function selectSubscribedCollection(collection: UserCollectionInfo) {
		clearSearchPanel();
		clearFollowingsPanel();
		userCollections = [];

		// 根据 collection_type 决定添加为收藏夹还是合集
		if (collection.collection_type === 'favorite') {
			// 这是收藏夹，切换到收藏夹模式
			sourceType = 'favorite';
			form.sourceId = collection.sid;
			name = collection.name;
			applyQuickSubscriptionPath('favorite', name, true);
			// 收藏夹不需要 form.upId 和 form.cover
			form.upId = '';
			form.cover = '';
			form.collectionType = '';
			toast.success('已选择收藏夹', { description: collection.name });
		} else {
			// 这是合集，保持合集模式
			sourceType = 'collection';
			form.sourceId = collection.sid;
			name = collection.name;
			applyQuickSubscriptionPath('collection', name, true);
			form.cover = collection.cover || '';
			form.upId = collection.up_mid.toString();
			form.collectionType = collection.collection_type;
			toast.success('已选择合集', { description: collection.name });
		}
		subscribedCollections = [];
	}

	// 处理投稿选择确认
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function handleSubmissionSelectionConfirm(selectedBvids: string[]) {
		submission.selectedVideos = selectedBvids;
		submission.open = false;
		if (selectedBvids.length > 0) {
			toast.success('已选择投稿', {
				description: `选择了 ${selectedBvids.length} 个历史投稿，新投稿将自动下载`
			});
		} else {
			toast.info('未选择投稿', {
				description: '将下载所有历史投稿和新投稿'
			});
		}
	}

	// 处理投稿选择取消
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function handleSubmissionSelectionCancel() {
		submission.open = false;
		// 保留已有的选择，不做清空
	}

	function startBatchAdd() {
		if (!options.filterOptionInheritGlobal && options.filterOptionDraft.codecs.length === 0) {
			toast.error('码率设置无效', { description: '至少保留一个编解码器' });
			return;
		}
		void batch.addAll();
	}

	$: batchSelectedTemplate = (() => {
		const selectedSourceType = batch.selectedSourceType;
		if (selectedSourceType === 'favorite') return quick.favorite.trim();
		if (selectedSourceType === 'collection') return quick.collection.trim();
		if (selectedSourceType === 'submission') return quick.submission.trim();
		if (selectedSourceType === 'bangumi') return quick.bangumi.trim();
		if (selectedSourceType === 'pugv') return quick.pugv.trim();
		return '';
	})();

	function selectAllVisible(itemType: string) {
		switch (itemType) {
			case 'search':
				filteredSearchResults.forEach((result, index) => {
					const key = `search_${result.bvid || result.season_id || result.mid || index}`;
					if (!batch.selectedItems.has(key)) {
						batch.toggle(key, result, 'search');
					}
				});
				break;
			case 'following':
				filteredUserFollowings.forEach((following) => {
					const key = `following_${following.mid}`;
					// 跳过已添加的UP主
					const isDisabled =
						sourceType === 'submission' && existingSubmissionIds.has(following.mid);
					if (!batch.selectedItems.has(key) && !isDisabled) {
						batch.toggle(key, following, 'following');
					}
				});
				break;
			case 'favorite':
				userFavorites.forEach((favorite) => {
					const key = `favorite_${favorite.id}`;
					// 跳过已添加的收藏夹
					const isDisabled = isFavoriteExists(favorite.id);
					if (!batch.selectedItems.has(key) && !isDisabled) {
						batch.toggle(key, favorite, 'favorite');
					}
				});
				break;
			case 'searched-favorite':
				searchedUserFavorites.forEach((favorite) => {
					const key = `searched-favorite_${favorite.id}`;
					// 跳过已添加的收藏夹（使用完整ID）
					const isDisabled = existingFavoriteIds.has(Number(favorite.id));
					if (!batch.selectedItems.has(key) && !isDisabled) {
						batch.toggle(key, favorite, 'favorite');
					}
				});
				break;
			case 'collection':
				userCollections.forEach((collection) => {
					const key = `collection_${collection.sid}_${normalizeCollectionType(collection.collection_type)}`;
					// 跳过已添加的合集
					const isDisabled = isCollectionExists(
						collection.sid,
						collection.mid.toString(),
						collection.collection_type
					);
					if (!batch.selectedItems.has(key) && !isDisabled) {
						batch.toggle(key, collection, 'collection');
					}
				});
				break;
			case 'subscribed-collection':
				subscribedCollections.forEach((collection) => {
					const key = `subscribed-collection_${collection.sid}_${collection.collection_type || 'season'}`;
					const isFavorite = collection.collection_type === 'favorite';
					// 跳过已添加项（收藏夹按fid判断，合集/系列按 sid+mid+type 判断）
					const isDisabled = isFavorite
						? existingFavoriteIds.has(Number(collection.sid))
						: isCollectionExists(
								collection.sid,
								collection.up_mid.toString(),
								collection.collection_type
							);
					if (!batch.selectedItems.has(key) && !isDisabled) {
						batch.toggle(key, collection, isFavorite ? 'favorite' : 'collection');
					}
				});
				break;
		}
	}
</script>

<svelte:head>
	<title>添加视频源</title>
</svelte:head>

<div class="py-2">
	<div class="mx-auto px-4">
		<div class="bg-card rounded-lg border p-6 shadow-sm">
			<div class="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<SectionHeader
					as="h1"
					title="添加 B 站视频源"
					description="搜索并配置收藏夹、合集、投稿、番剧或稍后再看等视频源。"
					titleClass="text-2xl font-bold"
					descriptionClass="text-muted-foreground mt-1 text-sm"
					class="flex-1"
				/>
				{#if sourcePlatform === 'bilibili' && sourceType !== 'bangumi' && sourceType !== 'watch_later'}
					<Button
						variant={batch.mode ? 'default' : 'outline'}
						size="sm"
						onclick={() => batch.toggleMode()}
						class="flex items-center gap-2"
					>
						{#if batch.mode}
							<X class="h-4 w-4" />
							退出批量模式
						{:else}
							<PlusIcon class="h-4 w-4" />
							批量添加
						{/if}
					</Button>
				{/if}
			</div>

			<div class="flex gap-8 {isCompactLayout ? 'flex-col' : ''}">
				<!-- 左侧：表单区域 -->
				<div class={isCompactLayout ? 'w-full' : 'max-w-[500px] min-w-[350px] flex-1'}>
					<form
						onsubmit={(e) => {
							e.preventDefault();
							handleSubmit();
						}}
						class="space-y-6"
					>
						<!-- 视频源类型 -->
						<div class="space-y-2">
							<Label for="source-type">视频源类型</Label>
							<CustomSelect
								id="source-type"
								value={sourceType}
								options={sourceTypeOptions}
								onChange={(nextValue) => (sourceType = nextValue as VideoCategory)}
								class="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
							/>
							<p class="text-muted-foreground text-sm">{currentTypeDescription}</p>
						</div>

						{#if sourcePlatform === 'bilibili'}
							<!-- 搜索功能 -->
							{#if sourceType !== 'favorite' && sourceType !== 'watch_later'}
								<div
									class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950"
								>
									<div class="space-y-2">
										<div>
											<Label for="search">
												{#if sourceType === 'collection'}
													搜索UP主
												{:else if sourceType === 'submission'}
													搜索UP主
												{:else if sourceType === 'bangumi'}
													搜索番剧
												{:else if sourceType === 'pugv'}
													搜索UP主（讲师）
												{:else}
													搜索B站内容
												{/if}
											</Label>
											<div class="flex {isMobile ? 'flex-col gap-2' : 'gap-2'} mt-2">
												<Input
													id="search"
													bind:value={search.keyword}
													placeholder={sourceType === 'submission' || sourceType === 'collection'
														? '搜索UP主...'
														: sourceType === 'bangumi'
															? '搜索番剧...'
															: sourceType === 'pugv'
																? '搜索UP主（讲师）...'
																: '搜索视频...'}
													onkeydown={(e) => {
														if (e.key === 'Enter') {
															// 阻止表单隐式提交
															e.preventDefault();
															handleSearch();
														}
													}}
												/>
												<div class="flex gap-2">
													<Button
														onclick={() => handleSearch()}
														disabled={search.loading || !search.keyword.trim()}
														size="sm"
														class={isMobile ? 'flex-1' : ''}
													>
														{#if search.loading}
															搜索中...
														{:else}
															<Search class="h-4 w-4" />
														{/if}
													</Button>
													{#if sourceType === 'collection' || sourceType === 'submission'}
														<Button
															onclick={sourceType === 'collection'
																? fetchSubscribedCollections
																: fetchUserFollowings}
															disabled={sourceType === 'collection'
																? loadingSubscribedCollections
																: loadingFollowings}
															size="sm"
															variant="outline"
															class={isMobile ? 'flex-1' : ''}
														>
															{sourceType === 'collection'
																? loadingSubscribedCollections
																	? '获取中...'
																	: '获取关注的合集'
																: loadingFollowings
																	? '获取中...'
																	: '获取关注'}
														</Button>
													{/if}
												</div>
											</div>
											<p class="text-muted-foreground mt-1 text-xs">
												{#if sourceType === 'collection'}
													搜索UP主后会自动填充UP主ID，并显示该UP主的所有合集供选择
												{:else if sourceType === 'submission'}
													搜索并选择UP主，将自动填充UP主ID
												{:else if sourceType === 'bangumi'}
													搜索并选择番剧，将自动填充Season ID
												{:else}
													根据当前选择的视频源类型搜索对应内容
												{/if}
											</p>
										</div>
									</div>
								</div>
							{/if}

							<!-- 收藏夹列表（仅收藏夹类型时显示） -->
							{#if sourceType === 'favorite'}
								<div class="space-y-4">
									<!-- 我的收藏夹 -->
									<div
										class="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950"
									>
										<div
											class="flex {isMobile
												? 'flex-col gap-2'
												: 'items-center justify-between'} mb-2"
										>
											<span class="text-sm font-medium text-yellow-800 dark:text-yellow-200"
												>我的收藏夹</span
											>
											<Button
												size="sm"
												variant="outline"
												onclick={fetchUserFavorites}
												disabled={loadingFavorites}
												class={isMobile ? 'w-full' : ''}
											>
												{loadingFavorites ? '加载中...' : '获取收藏夹'}
											</Button>
										</div>

										{#if userFavorites.length > 0}
											<p class="text-xs text-yellow-600 dark:text-yellow-400">
												已获取 {userFavorites.length} 个收藏夹，请在{isCompactLayout
													? '下方'
													: '右侧'}选择
											</p>
										{:else}
											<p class="text-xs text-yellow-600 dark:text-yellow-400">
												点击右侧按钮获取您的收藏夹列表
											</p>
										{/if}
									</div>

									<!-- 他人的公开收藏夹 -->
									<div
										class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950"
									>
										<div class="mb-3">
											<span class="text-sm font-medium text-blue-800 dark:text-blue-200"
												>他人的公开收藏夹</span
											>
										</div>

										<!-- 搜索UP主的收藏夹 -->
										<div class="bg-card mb-4 rounded border border-gray-200 p-3">
											<div class="mb-2">
												<Label class="text-foreground text-sm font-medium">搜索UP主的收藏夹</Label>
											</div>
											<div class="flex {isMobile ? 'flex-col gap-2' : 'gap-2'}">
												<Input
													placeholder="搜索UP主名称..."
													bind:value={search.keyword}
													onkeydown={(e) => e.key === 'Enter' && handleSearch()}
												/>
												<Button
													onclick={() => handleSearch()}
													disabled={search.loading || !search.keyword.trim()}
													size="sm"
													class={isMobile ? 'w-full' : ''}
												>
													{#if search.loading}搜索中...{:else}搜索{/if}
												</Button>
											</div>

											<p class="text-muted-foreground mt-2 text-xs">
												{#if search.open && search.results.length > 0}
													找到 {search.results.length} 个UP主，请在{isCompactLayout
														? '下方'
														: '右侧'}列表中选择
												{:else}
													输入UP主名称后点击搜索，结果将在{isCompactLayout ? '下方' : '右侧'}显示
												{/if}
											</p>
										</div>

										<!-- 手动输入收藏夹ID -->
										<div class="text-xs text-blue-600 dark:text-blue-400">
											<strong>或者手动输入收藏夹ID：</strong><br />
											1. 打开想要添加的收藏夹页面<br />
											2. 复制URL中 "fid=" 后面的数字<br />
											3. 在下方输入框中填写该数字
										</div>
									</div>
								</div>
							{/if}

							<!-- 合集类型（仅合集时显示，且手动输入） -->
							{#if sourceType === 'collection' && form.isManualInput}
								<div class="space-y-2">
									<Label for="collection-type">合集类型</Label>
									<CustomSelect
										id="collection-type"
										value={form.collectionType}
										options={collectionTypeOptions}
										onChange={(nextValue) => (form.collectionType = String(nextValue ?? 'season'))}
										class="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
									/>
									<p class="text-sm text-orange-600">
										⚠️ 手动输入合集ID时需要指定类型，建议从{isCompactLayout
											? '下方'
											: '右侧'}合集列表中选择
									</p>
								</div>
							{/if}

							<!-- UP主ID（仅合集时显示） -->
							{#if sourceType === 'collection'}
								<div class="space-y-2">
									<Label for="up-id">UP主ID</Label>
									<Input
										id="up-id"
										bind:value={form.upId}
										placeholder="请输入UP主ID"
										onblur={handleUpIdChange}
										required
									/>
									{#if userCollections.length > 0}
										<p class="mt-1 text-xs text-green-600">
											✓ 已获取合集列表，请在{isCompactLayout ? '下方' : '右侧'}选择
										</p>
									{/if}
								</div>

								<div class="space-y-2">
									<Label>合集聚合</Label>
									<div
										class="flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-950/30"
									>
										<div class="pr-3">
											<div class="text-sm font-medium text-blue-800 dark:text-blue-200">
												按同UP合集绝对顺序聚合
											</div>
											<p class="mt-1 text-xs text-blue-600 dark:text-blue-300">
												开启后，该合集会归并到“同UP合集根目录”，并按该UP远端全部合集/系列列表的绝对顺序映射
												Season xx。
											</p>
										</div>
										<label class="relative inline-flex cursor-pointer items-center">
											<input
												type="checkbox"
												bind:checked={form.collectionAggregateEnabled}
												class="peer sr-only"
											/>
											<div
												class="peer h-5 w-9 rounded-full bg-gray-300 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-600 dark:peer-checked:bg-blue-500"
											></div>
										</label>
									</div>
									<p class="text-muted-foreground text-xs">
										关闭时保持合集源独立目录；开启时不压缩季号，远端排第几就是 Season 几。
									</p>
								</div>
							{/if}

							<!-- 视频源ID（稍后观看除外） -->
							{#if sourceType !== 'watch_later'}
								<div class="space-y-2">
									<Label for="source-id">
										{#if sourceType === 'collection'}合集ID
										{:else if sourceType === 'favorite'}收藏夹ID
										{:else if sourceType === 'submission'}UP主ID
										{:else if sourceType === 'bangumi'}Season ID
										{:else if sourceType === 'pugv'}课程 Season ID
										{:else}ID{/if}
									</Label>
									<Input
										id="source-id"
										bind:value={form.sourceId}
										placeholder={`请输入${sourceType === 'collection' ? '合集' : sourceType === 'favorite' ? '任意公开收藏夹' : sourceType === 'submission' ? 'UP主' : sourceType === 'bangumi' ? 'Season' : sourceType === 'pugv' ? '课程 Season' : ''}ID`}
										oninput={() => {
											if (sourceType === 'collection') {
												form.isManualInput = true;
											} else if (sourceType === 'favorite') {
												handleFavoriteIdChange();
											} else if (sourceType === 'pugv') {
												form.sourceId = normalizePugvSeasonId(form.sourceId);
											}
										}}
										required={!(sourceType === 'pugv' && !!pugv.upMid)}
									/>
									{#if sourceType === 'pugv'}
										<p class="text-muted-foreground text-xs">
											{#if pugv.upMid}
												已在右侧选择讲师，此处可留空；添加时会使用勾选课程的课程 ID
											{:else}
												可直接粘贴课程链接，例如 https://www.bilibili.com/cheese/play/ss713799843
											{/if}
										</p>
									{/if}
									{#if sourceType === 'collection' && !form.isManualInput && form.sourceId}
										<p class="mt-1 text-xs text-green-600">✓ 已从列表中选择合集，类型已自动识别</p>
									{/if}
									{#if sourceType === 'favorite' && form.sourceId}
										{#if validatingFavorite}
											<p class="mt-1 text-xs text-blue-600 dark:text-blue-400">
												🔍 验证收藏夹中...
											</p>
										{:else if favoriteValidationResult}
											{#if favoriteValidationResult.valid}
												<p class="mt-1 text-xs text-green-600">
													✓ 收藏夹验证成功：{favoriteValidationResult.title}
												</p>
											{:else}
												<p class="mt-1 text-xs text-red-600">
													✗ {favoriteValidationResult.message}
												</p>
											{/if}
										{/if}
									{/if}

									<!-- 下载所有季度（仅番剧时显示，紧跟在Season ID后面） -->
									{#if sourceType === 'bangumi' && form.sourceId && bangumi.seasons.length > 0 && !bangumi.loading}
										<div class="mt-3 flex items-center space-x-2">
											<input
												type="checkbox"
												id="download-all-seasons"
												bind:checked={form.downloadAllSeasons}
												onchange={() => {
													if (form.downloadAllSeasons) bangumi.selected = [];
												}}
												class="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
											/>
											<Label
												for="download-all-seasons"
												class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
											>
												下载所有季度
											</Label>
										</div>
										{#if form.downloadAllSeasons}
											<p class="mt-1 ml-6 text-xs text-purple-600">
												勾选后将下载该番剧的所有季度，无需单独选择
											</p>
										{:else if bangumi.seasons.length > 1}
											<p class="mt-1 ml-6 text-xs text-purple-600">
												检测到 {bangumi.seasons.length} 个相关季度，请在{isCompactLayout
													? '下方'
													: '右侧'}选择要下载的季度
											</p>
										{:else if bangumi.seasons.length === 1}
											<p class="mt-1 ml-6 text-xs text-purple-600">该番剧只有当前一个季度</p>
										{/if}

										<!-- 合并到现有番剧源选项 -->
										{#if bangumi.existingSources.length > 0}
											<div class="mt-3 space-y-2">
												<Label class="text-sm font-medium">合并选项（可选）</Label>
												<CustomSelect
													value={bangumi.mergeToSourceId}
													options={[
														{ value: null, label: '作为新的独立番剧源添加' },
														...bangumi.existingSources.map((source) => ({
															value: source.id,
															label: `合并到：${source.name}${source.season_id ? ` (Season ID: ${source.season_id})` : ''}${source.media_id ? ` (Media ID: ${source.media_id})` : ''}`
														}))
													]}
													onChange={(nextValue) =>
														(bangumi.mergeToSourceId = nextValue as number | null)}
													class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
												/>
												{#if bangumi.mergeToSourceId}
													<p class="text-xs text-orange-600">
														⚠️ 合并后，新番剧的内容将添加到选中的现有番剧源中，不会创建新的番剧源
													</p>
												{:else}
													<p class="text-xs text-gray-500">
														可以选择将新番剧合并到现有番剧源中，方便管理相关内容（如新季度、剧场版等）
													</p>
												{/if}
											</div>
										{/if}
									{:else if sourceType === 'bangumi' && form.sourceId && bangumi.loading}
										<p class="mt-3 text-xs text-purple-600">正在获取季度信息...</p>
									{/if}

									<!-- UP主投稿选择状态显示和控制（仅投稿类型时显示） -->
									{#if sourceType === 'submission' && form.sourceId}
										<div
											class="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950"
										>
											<div class="flex items-center justify-between">
												<div>
													<span class="text-sm font-medium text-blue-800 dark:text-blue-200"
														>历史投稿选择</span
													>
													<span class="ml-2 text-xs text-blue-600 dark:text-blue-400">
														{#if submission.selectedVideos.length > 0}
															已选择 {submission.selectedVideos.length} 个历史投稿
														{:else}
															未选择特定投稿（将下载全部）
														{/if}
													</span>
												</div>
												<Button
													size="sm"
													variant="outline"
													onclick={() => {
														submission.open = true;
													}}
													class="border-blue-300 text-blue-700 hover:bg-blue-100"
												>
													{submission.selectedVideos.length > 0 ? '重新选择' : '选择投稿'}
												</Button>
											</div>
											<p class="mt-2 text-xs text-blue-600 dark:text-blue-400">
												💡
												您可以选择特定的历史投稿进行下载，未选择的视频将不会下载但会在数据库中记录。新发布的投稿会自动下载。
											</p>
										</div>
									{/if}
								</div>
							{/if}
						{/if}

						<!-- 名称 -->
						<div class="space-y-2">
							<Label for="name">名称</Label>
							<Input
								id="name"
								bind:value={name}
								placeholder="请输入视频源名称"
								oninput={handleNameInput}
								required
								disabled={bangumi.isMerging || batch.mode}
							/>
							{#if bangumi.isMerging}
								<p class="text-xs text-purple-600">合并时自动沿用目标番剧源的名称</p>
							{:else if batch.mode}
								<p class="text-xs text-blue-600">批量模式下名称自动使用所选视频源信息</p>
							{/if}
						</div>

						<!-- 保存路径 -->
						<div class="space-y-2">
							<div class="flex items-center justify-between gap-2">
								<div class="flex items-center gap-1">
									<Label for="path">保存路径</Label>
									<div class="group relative">
										<InfoIcon class="text-muted-foreground h-4 w-4 cursor-help" />
										<div
											class="bg-popover absolute bottom-full left-0 z-50 mb-2 hidden w-72 rounded-md border p-3 text-sm shadow-md group-hover:block"
										>
											<p class="mb-1 font-medium">Docker 路径说明</p>
											<p class="text-muted-foreground text-xs">
												如果使用 Docker 部署并设置了卷映射，请填写容器内路径。
											</p>
											<p class="text-muted-foreground mt-1 text-xs">
												例如映射 <code class="bg-muted rounded px-1"
													>/volume1/Videos:/Downloads</code
												>
											</p>
											<p class="text-muted-foreground text-xs">
												则应填写 <code class="bg-muted rounded px-1">/Downloads</code>
											</p>
										</div>
									</div>
								</div>
								{#if currentQuickSubscriptionTemplate && !batch.mode}
									<Button
										type="button"
										size="sm"
										variant="outline"
										disabled={!name.trim() || bangumi.isMerging}
										onclick={() =>
											applyQuickSubscriptionPath(currentQuickSubscriptionType, name, true)}
									>
										套用快捷模板
									</Button>
								{/if}
							</div>
							<Input
								id="path"
								bind:value={path}
								placeholder="例如：D:/Videos/Bilibili"
								oninput={() => {
									if (path !== quick.lastAutoAppliedPath) {
										quick.lastAutoAppliedPath = '';
									}
								}}
								required
								disabled={bangumi.isMerging}
							/>
							{#if bangumi.isMerging}
								<p class="text-xs text-purple-600">合并时自动沿用目标番剧源的保存路径</p>
							{:else}
								<div class="space-y-1">
									<p class="text-muted-foreground text-sm">请输入绝对路径</p>
									{#if downloadFilePathPreview}
										<p class="text-xs break-all text-emerald-600">
											示例完整路径：{downloadFilePathPreview}
										</p>
									{/if}
									{#if currentQuickSubscriptionTemplate && !batch.mode}
										<p class="text-muted-foreground text-xs">
											已配置快捷路径模板，支持 <code>{'{{name}}'}</code> 变量。选择源后会自动带入，也可继续手动修改。
										</p>
									{/if}
								</div>
							{/if}
						</div>

						<!-- 下载选项 -->
						<div class="space-y-3">
							<Label class="text-sm font-medium">下载选项</Label>
							<div
								class="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800"
							>
								<!-- 仅下载音频 -->
								<div
									class="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
								>
									<div class="flex items-center gap-2">
										<svg
											class="h-4 w-4 text-gray-600 dark:text-gray-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
											/>
										</svg>
										<div>
											<span class="text-xs font-medium text-gray-700 dark:text-gray-300"
												>仅下载音频</span
											>
											<p class="text-[10px] text-gray-500 dark:text-gray-400">
												仅提取音频并转换为M4A格式，适合音乐类视频
											</p>
										</div>
									</div>
									<label class="relative inline-flex cursor-pointer items-center">
										<input type="checkbox" bind:checked={options.audioOnly} class="peer sr-only" />
										<div
											class="peer h-5 w-9 rounded-full bg-gray-300 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-600 dark:peer-checked:bg-blue-500"
										></div>
									</label>
								</div>

								<!-- 仅保留M4A（仅在音频模式开启时显示） -->
								{#if options.audioOnly}
									<div
										class="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-600 dark:bg-amber-900/30"
									>
										<div class="flex items-center gap-2">
											<svg
												class="h-4 w-4 text-amber-600 dark:text-amber-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
												/>
											</svg>
											<div>
												<span class="text-xs font-medium text-amber-700 dark:text-amber-300"
													>仅保留M4A</span
												>
												<p class="text-[10px] text-amber-600 dark:text-amber-400">
													只下载音频文件，不下载封面、NFO、弹幕、字幕
												</p>
											</div>
										</div>
										<label class="relative inline-flex cursor-pointer items-center">
											<input
												type="checkbox"
												bind:checked={options.audioOnlyM4aOnly}
												class="peer sr-only"
											/>
											<div
												class="peer h-5 w-9 rounded-full bg-gray-300 peer-checked:bg-amber-600 peer-focus:ring-2 peer-focus:ring-amber-500 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-600 dark:peer-checked:bg-amber-500"
											></div>
										</label>
									</div>
								{/if}

								<!-- 平铺目录模式 -->
								<div
									class="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
								>
									<div class="flex items-center gap-2">
										<svg
											class="h-4 w-4 text-purple-600 dark:text-purple-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
											/>
										</svg>
										<div>
											<span class="text-xs font-medium text-gray-700 dark:text-gray-300"
												>平铺目录</span
											>
											<p class="text-[10px] text-gray-500 dark:text-gray-400">
												所有文件直接放入根目录，不创建子文件夹
											</p>
										</div>
									</div>
									<label class="relative inline-flex cursor-pointer items-center">
										<input type="checkbox" bind:checked={options.flatFolder} class="peer sr-only" />
										<div
											class="peer h-5 w-9 rounded-full bg-gray-300 peer-checked:bg-purple-600 peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-600 dark:peer-checked:bg-purple-500"
										></div>
									</label>
								</div>

								{#if sourcePlatform === 'bilibili'}
									<!-- 分章下载 -->
									<div
										class="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
									>
										<div class="flex items-center gap-2">
											<svg
												class="h-4 w-4 text-emerald-600 dark:text-emerald-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
												/>
											</svg>
											<div>
												<span class="text-xs font-medium text-gray-700 dark:text-gray-300"
													>分章下载</span
												>
												<p class="text-[10px] text-gray-500 dark:text-gray-400">
													下载完成后按播放器章节切分为独立视频
												</p>
											</div>
										</div>
										<label class="relative inline-flex cursor-pointer items-center">
											<input
												type="checkbox"
												bind:checked={options.splitChaptersAfterDownload}
												class="peer sr-only"
											/>
											<div
												class="peer h-5 w-9 rounded-full bg-gray-300 peer-checked:bg-emerald-600 peer-focus:ring-2 peer-focus:ring-emerald-500 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-600 dark:peer-checked:bg-emerald-500"
											></div>
										</label>
									</div>

									<!-- 下载充电视频 -->
									<div
										class="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
									>
										<div class="flex items-center gap-2">
											<svg
												class="h-4 w-4 text-pink-600 dark:text-pink-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M13 10V3L4 14h7v7l9-11h-7z"
												/>
											</svg>
											<div>
												<span class="text-xs font-medium text-gray-700 dark:text-gray-300"
													>下载充电视频</span
												>
												<p class="text-[10px] text-gray-500 dark:text-gray-400">
													关闭后，识别为充电专享的视频只保留元数据，不下载媒体或占位文件
												</p>
											</div>
										</div>
										<label class="relative inline-flex cursor-pointer items-center">
											<input
												type="checkbox"
												bind:checked={options.downloadChargeVideos}
												class="peer sr-only"
											/>
											<div
												class="peer h-5 w-9 rounded-full bg-gray-300 peer-checked:bg-pink-600 peer-focus:ring-2 peer-focus:ring-pink-500 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-600 dark:peer-checked:bg-pink-500"
											></div>
										</label>
									</div>

									<!-- 动态API（仅UP主投稿） -->
									{#if sourceType === 'submission'}
										<div
											class="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
										>
											<div class="flex items-center gap-2">
												<svg
													class="h-4 w-4 text-blue-600 dark:text-blue-400"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M5 12a7 7 0 0114 0M8 12a4 4 0 018 0M12 20h.01"
													/>
												</svg>
												<div>
													<span class="text-xs font-medium text-gray-700 dark:text-gray-300"
														>使用动态API</span
													>
													<p class="text-[10px] text-gray-500 dark:text-gray-400">
														只有使用动态API才能拉取到动态视频，但该接口不提供分页参数，每次请求只能拉取12条视频。
														这会一定程度上增加请求次数，用户可根据实际情况酌情选择，推荐仅在UP主有较多动态视频时开启。
													</p>
												</div>
											</div>
											<label class="relative inline-flex cursor-pointer items-center">
												<input
													type="checkbox"
													bind:checked={options.useDynamicApi}
													class="peer sr-only"
												/>
												<div
													class="peer h-5 w-9 rounded-full bg-gray-300 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-600 dark:peer-checked:bg-blue-500"
												></div>
											</label>
										</div>
									{/if}
								{/if}

								<!-- 下载弹幕 -->
								<div
									class="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
								>
									<div class="flex items-center gap-2">
										<svg
											class="h-4 w-4 text-gray-600 dark:text-gray-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
											/>
										</svg>
										<div>
											<span class="text-xs font-medium text-gray-700 dark:text-gray-300"
												>下载弹幕</span
											>
											<p class="text-[10px] text-gray-500 dark:text-gray-400">
												下载时间轴弹幕并生成 ASS
											</p>
										</div>
									</div>
									<label class="relative inline-flex cursor-pointer items-center">
										<input
											type="checkbox"
											bind:checked={options.downloadDanmaku}
											class="peer sr-only"
										/>
										<div
											class="peer h-5 w-9 rounded-full bg-gray-300 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-600 dark:peer-checked:bg-blue-500"
										></div>
									</label>
								</div>

								<!-- 下载字幕 -->
								<div
									class="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
								>
									<div class="flex items-center gap-2">
										<svg
											class="h-4 w-4 text-gray-600 dark:text-gray-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
											/>
										</svg>
										<div>
											<span class="text-xs font-medium text-gray-700 dark:text-gray-300"
												>下载字幕</span
											>
											<p class="text-[10px] text-gray-500 dark:text-gray-400">
												下载CC字幕文件（SRT格式）
											</p>
										</div>
									</div>
									<label class="relative inline-flex cursor-pointer items-center">
										<input
											type="checkbox"
											bind:checked={options.downloadSubtitle}
											class="peer sr-only"
										/>
										<div
											class="peer h-5 w-9 rounded-full bg-gray-300 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-600 dark:peer-checked:bg-blue-500"
										></div>
									</label>
								</div>

								{#if options.downloadSubtitle}
									<div
										class="mt-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 dark:border-blue-900 dark:bg-blue-950/40"
									>
										<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
											<div class="flex items-center gap-2">
												<LanguagesIcon class="h-4 w-4 text-blue-600 dark:text-blue-400" />
												<div>
													<span class="text-xs font-medium text-gray-700 dark:text-gray-300">
														下载 AI 字幕
													</span>
													<p class="text-[10px] text-gray-500 dark:text-gray-400">
														目标语言缺失时回退中文
													</p>
												</div>
											</div>
											<div class="flex flex-wrap items-center gap-2">
												{#if sourcePlatform === 'bilibili'}
													<label class="relative inline-flex cursor-pointer items-center">
														<input
															type="checkbox"
															bind:checked={options.downloadAiSubtitle}
															class="peer sr-only"
														/>
														<div
															class="peer h-5 w-9 rounded-full bg-gray-300 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-600 dark:peer-checked:bg-blue-500"
														></div>
													</label>
												{/if}
												<CustomSelect
													value={options.aiSubtitleLanguage}
													options={AI_SUBTITLE_LANGUAGE_OPTIONS}
													disabled={!options.downloadAiSubtitle}
													title="AI 字幕优先语言"
													onChange={(nextValue) =>
														(options.aiSubtitleLanguage = String(
															nextValue ?? DEFAULT_AI_SUBTITLE_LANGUAGE
														))}
													size="sm"
													class="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
												/>
											</div>
										</div>
									</div>
								{/if}

								<!-- AI重命名 -->
								<div
									class="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
								>
									<div class="flex items-center gap-2">
										<svg
											class="h-4 w-4 text-blue-600 dark:text-blue-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
											/>
										</svg>
										<div>
											<span class="text-xs font-medium text-gray-700 dark:text-gray-300"
												>AI重命名</span
											>
											<p class="text-[10px] text-gray-500 dark:text-gray-400">
												使用AI对下载的文件进行智能重命名
											</p>
										</div>
									</div>
									<label class="relative inline-flex cursor-pointer items-center">
										<input type="checkbox" bind:checked={options.aiRename} class="peer sr-only" />
										<div
											class="peer h-5 w-9 rounded-full bg-gray-300 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-600 dark:peer-checked:bg-blue-500"
										></div>
									</label>
								</div>

								<!-- AI重命名提示词设置（仅在启用AI重命名时显示） -->
								{#if options.aiRename}
									<div
										class="mt-3 space-y-3 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950"
									>
										<div class="text-xs font-medium text-blue-800 dark:text-blue-200">
											自定义提示词（留空使用全局配置）
										</div>
										<!-- 视频提示词 -->
										<div class="space-y-1">
											<label
												for="ai-video-prompt"
												class="text-[10px] font-medium text-gray-600 dark:text-gray-400"
											>
												视频重命名提示词
											</label>
											<textarea
												id="ai-video-prompt"
												bind:value={options.aiRenameVideoPrompt}
												placeholder="例如：作者-标题-来源-清晰度"
												rows="2"
												class="w-full resize-none rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
											></textarea>
										</div>
										<!-- 音频提示词 -->
										<div class="space-y-1">
											<label
												for="ai-audio-prompt"
												class="text-[10px] font-medium text-gray-600 dark:text-gray-400"
											>
												音频重命名提示词
											</label>
											<textarea
												id="ai-audio-prompt"
												bind:value={options.aiRenameAudioPrompt}
												placeholder="例如：歌手-歌名-版本信息"
												rows="2"
												class="w-full resize-none rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
											></textarea>
										</div>
										<!-- 提示词写法说明 -->
										<div
											class="rounded border border-amber-300 bg-amber-50 p-2 dark:border-amber-700 dark:bg-amber-950"
										>
											<p class="text-[10px] text-amber-700 dark:text-amber-300">
												⚠️ 提示词需具体明确，模糊描述（如"作者"）可能被理解为UP主而非歌手。<br />
												💡 AI会严格按格式生成。示例：<code
													class="rounded bg-amber-200 px-0.5 dark:bg-amber-800"
													>BV号-歌手名-日期</code
												><br />
												可用字段：BV号、UP主、标题、歌手、分区、日期、排序位置等
											</p>
										</div>

										<!-- 高级选项（默认关闭） -->
										<div
											class="space-y-2 rounded border border-gray-300 bg-gray-50 p-2 dark:border-gray-600 dark:bg-gray-800"
										>
											<button
												type="button"
												onclick={() =>
													(options.showAiRenameAdvanced = !options.showAiRenameAdvanced)}
												class="flex w-full items-center justify-between text-left"
											>
												<span class="text-[10px] font-medium text-gray-700 dark:text-gray-300"
													>高级选项（默认关闭，有风险）</span
												>
												<svg
													class="h-3 w-3 transform text-gray-500 transition-transform {options.showAiRenameAdvanced
														? 'rotate-180'
														: ''}"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M19 9l-7 7-7-7"
													/>
												</svg>
											</button>

											{#if options.showAiRenameAdvanced}
												<div class="space-y-1.5 pt-1">
													<label class="flex items-center space-x-2">
														<input
															type="checkbox"
															bind:checked={options.aiRenameEnableMultiPage}
															class="h-3 w-3 rounded border-gray-300"
														/>
														<span class="text-[10px] text-gray-700 dark:text-gray-300"
															>对多P视频启用AI重命名</span
														>
													</label>
													<label class="flex items-center space-x-2">
														<input
															type="checkbox"
															bind:checked={options.aiRenameEnableCollection}
															class="h-3 w-3 rounded border-gray-300"
														/>
														<span class="text-[10px] text-gray-700 dark:text-gray-300"
															>对合集视频启用AI重命名</span
														>
													</label>
													<label class="flex items-center space-x-2">
														<input
															type="checkbox"
															bind:checked={options.aiRenameEnableBangumi}
															class="h-3 w-3 rounded border-gray-300"
														/>
														<span class="text-[10px] text-gray-700 dark:text-gray-300"
															>对番剧启用AI重命名</span
														>
													</label>
													<label class="flex items-center space-x-2">
														<input
															type="checkbox"
															bind:checked={options.aiRenameRenameParentDir}
															class="h-3 w-3 rounded border-gray-300"
														/>
														<span class="text-[10px] text-gray-700 dark:text-gray-300"
															>重命名上级目录</span
														>
													</label>
													<!-- 风险警告 -->
													<div
														class="rounded border border-red-300 bg-red-50 p-1.5 dark:border-red-700 dark:bg-red-950"
													>
														<p class="text-[9px] text-red-700 dark:text-red-300">
															⚠️ 以上选项为实验性功能，可能导致文件丢失。建议先小范围测试。
														</p>
													</div>
												</div>
											{/if}
										</div>
									</div>
								{/if}
							</div>
						</div>

						<!-- 源级码率/流过滤设置 -->
						<div class="space-y-3">
							<div
								class="flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-950/30"
							>
								<div class="flex items-center gap-2 pr-3">
									<SlidersHorizontalIcon class="h-4 w-4 text-blue-600 dark:text-blue-400" />
									<div>
										<span class="text-sm font-medium text-blue-800 dark:text-blue-200">
											源级码率/流过滤
										</span>
										<p class="text-[10px] text-blue-600 dark:text-blue-300">
											可为本次添加的专集、UP、收藏夹、稍后观看或番剧单独设置质量筛选规则
										</p>
									</div>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-xs text-blue-700 dark:text-blue-300">继承全局</span>
									<label class="relative inline-flex cursor-pointer items-center">
										<input
											type="checkbox"
											bind:checked={options.filterOptionInheritGlobal}
											class="peer sr-only"
										/>
										<div
											class="peer h-5 w-9 rounded-full bg-gray-300 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-600 dark:peer-checked:bg-blue-500"
										></div>
									</label>
								</div>
							</div>

							{#if options.filterOptionInheritGlobal}
								<p class="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
									当前新源会继承设置页的全局视频/音频质量配置；关闭“继承全局”后可为该同步源单独限码率。
								</p>
							{:else}
								<div
									class="rounded-md border border-blue-200 bg-white p-4 dark:border-blue-800 dark:bg-gray-900"
								>
									<FilterOptionEditor
										value={options.filterOptionDraft}
										on:change={(event) => (options.filterOptionDraft = event.detail)}
									/>
								</div>
							{/if}
						</div>

						<!-- 关键词过滤器（可折叠，双列表模式） -->
						<div class="space-y-2">
							<button
								type="button"
								onclick={() => (filter.showSection = !filter.showSection)}
								class="flex w-full items-center justify-between rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-left text-sm transition-colors hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950 dark:hover:bg-purple-900"
							>
								<div class="flex items-center gap-2">
									<FilterIcon class="h-4 w-4 text-purple-600 dark:text-purple-400" />
									<span class="font-medium text-purple-800 dark:text-purple-200">关键词过滤器</span>
									{#if filter.activeFilterCount > 0}
										<span
											class="rounded-full bg-purple-600 px-2 py-0.5 text-xs text-white dark:bg-purple-500"
										>
											{filter.activeFilterCount}
										</span>
									{/if}
								</div>
								<svg
									class="h-4 w-4 transform text-purple-600 transition-transform dark:text-purple-400 {filter.showSection
										? 'rotate-180'
										: ''}"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 9l-7 7-7-7"
									/>
								</svg>
							</button>

							{#if filter.showSection}
								<div
									class="space-y-3 rounded-md border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-800 dark:bg-purple-950/50"
									transition:fly={{ y: -10, duration: 200 }}
								>
									<!-- 过滤逻辑说明 -->
									<div
										class="rounded-md border border-blue-200 bg-blue-50 p-2 dark:border-blue-800 dark:bg-blue-950"
									>
										<p class="text-xs font-medium text-blue-800 dark:text-blue-200">过滤逻辑说明</p>
										<ul class="mt-1 space-y-0.5 text-xs text-blue-700 dark:text-blue-300">
											<li>1. 如果设置了白名单，视频必须匹配至少一个白名单关键词才会被下载</li>
											<li>2. 匹配黑名单的视频会被排除（即使通过了白名单）</li>
											<li>3. 同一关键词不能同时出现在黑名单和白名单中</li>
										</ul>
									</div>

									<!-- 大小写敏感设置 -->
									<div
										class="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
									>
										<div class="flex items-center gap-2">
											<svg
												class="h-4 w-4 text-gray-600 dark:text-gray-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
												/>
											</svg>
											<span class="text-xs font-medium text-gray-700 dark:text-gray-300"
												>区分大小写</span
											>
										</div>
										<label class="relative inline-flex cursor-pointer items-center">
											<input
												type="checkbox"
												bind:checked={filter.caseSensitive}
												class="peer sr-only"
											/>
											<div
												class="peer h-5 w-9 rounded-full bg-gray-300 peer-checked:bg-purple-600 peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-600 dark:peer-checked:bg-purple-500"
											></div>
										</label>
									</div>
									<p class="text-[10px] text-gray-500 dark:text-gray-400">
										{filter.caseSensitive
											? '启用：ABC 和 abc 被视为不同的关键词'
											: '禁用：ABC 和 abc 被视为相同的关键词'}
									</p>

									<div
										class="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950"
									>
										<p class="text-xs font-medium text-amber-800 dark:text-amber-200">
											附加过滤条件
										</p>
										<div class="mt-2 grid gap-2 md:grid-cols-2">
											<div class="space-y-1">
												<label
													for="add-source-min-duration"
													class="text-[10px] font-medium text-gray-700 dark:text-gray-300"
													>最短时长（秒）</label
												>
												<Input
													id="add-source-min-duration"
													type="number"
													min="0"
													step="1"
													bind:value={filter.minDuration}
													placeholder="例如 60"
													class="h-8 text-xs"
												/>
											</div>
											<div class="space-y-1">
												<label
													for="add-source-max-duration"
													class="text-[10px] font-medium text-gray-700 dark:text-gray-300"
													>最长时长（秒）</label
												>
												<Input
													id="add-source-max-duration"
													type="number"
													min="0"
													step="1"
													bind:value={filter.maxDuration}
													placeholder="例如 1800"
													class="h-8 text-xs"
												/>
											</div>
											<div class="space-y-1">
												<label
													for="add-source-published-after"
													class="text-[10px] font-medium text-gray-700 dark:text-gray-300"
													>投稿起始日期</label
												>
												<Input
													id="add-source-published-after"
													type="date"
													bind:value={filter.publishedAfter}
													class="h-8 text-xs"
												/>
											</div>
											<div class="space-y-1">
												<label
													for="add-source-published-before"
													class="text-[10px] font-medium text-gray-700 dark:text-gray-300"
													>投稿截止日期</label
												>
												<Input
													id="add-source-published-before"
													type="date"
													bind:value={filter.publishedBefore}
													class="h-8 text-xs"
												/>
											</div>
										</div>
										<p class="mt-2 text-[10px] text-amber-700 dark:text-amber-300">
											留空表示不限制。投稿时间按自然日过滤，起止日期均包含当天。
										</p>
										{#if filter.advancedError}
											<p class="mt-1 text-[10px] text-red-500">{filter.advancedError}</p>
										{/if}
									</div>

									<!-- 标签页切换 -->
									<div class="flex border-b border-gray-200 dark:border-gray-700">
										<button
											type="button"
											class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors {filter.activeTab ===
											'whitelist'
												? 'border-b-2 border-green-500 text-green-600 dark:text-green-400'
												: 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}"
											onclick={() => (filter.activeTab = 'whitelist')}
										>
											<svg
												class="h-3.5 w-3.5"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
												/>
											</svg>
											白名单
											<span
												class="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700 dark:bg-green-900 dark:text-green-300"
											>
												{filter.whitelist.length}
											</span>
										</button>
										<button
											type="button"
											class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors {filter.activeTab ===
											'blacklist'
												? 'border-b-2 border-red-500 text-red-600 dark:text-red-400'
												: 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}"
											onclick={() => (filter.activeTab = 'blacklist')}
										>
											<svg
												class="h-3.5 w-3.5"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
												/>
											</svg>
											黑名单
											<span
												class="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700 dark:bg-red-900 dark:text-red-300"
											>
												{filter.blacklist.length}
											</span>
										</button>
									</div>

									<!-- 白名单内容 -->
									{#if filter.activeTab === 'whitelist'}
										<div
											class="space-y-2 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950"
										>
											<p class="text-[10px] text-green-700 dark:text-green-300">
												只下载匹配的视频（留空则不限制）
											</p>

											<!-- 添加白名单关键词 -->
											<div class="flex gap-1">
												<Input
													bind:value={filter.newWhitelist}
													placeholder="输入关键词"
													onkeydown={filter.handleWhitelistKeydown}
													disabled={filter.validatingWhitelist}
													class="h-8 flex-1 text-xs"
												/>
												<Button
													type="button"
													size="sm"
													onclick={filter.addWhitelist}
													disabled={!filter.newWhitelist.trim() || filter.validatingWhitelist}
													class="h-8 bg-green-600 px-2 text-xs hover:bg-green-700"
												>
													{filter.validatingWhitelist ? '...' : '添加'}
												</Button>
											</div>
											{#if filter.whitelistError}
												<p class="text-[10px] text-red-500">{filter.whitelistError}</p>
											{/if}

											<!-- 白名单列表 -->
											<div class="max-h-32 space-y-1 overflow-y-auto">
												{#if filter.whitelist.length === 0}
													<p
														class="py-2 text-center text-[10px] text-green-600 italic dark:text-green-400"
													>
														暂无白名单关键词
													</p>
												{:else}
													{#each filter.whitelist as keyword, index (keyword)}
														<div
															class="flex items-center justify-between rounded bg-green-100 px-2 py-1 dark:bg-green-900"
														>
															<code
																class="flex-1 truncate text-[10px] text-green-800 dark:text-green-200"
																>{keyword}</code
															>
															<button
																type="button"
																onclick={() => filter.removeWhitelist(index)}
																class="ml-1 flex-shrink-0 rounded p-0.5 text-green-600 hover:bg-green-200 hover:text-red-600 dark:hover:bg-green-800"
																title="删除"
															>
																<X class="h-3 w-3" />
															</button>
														</div>
													{/each}
												{/if}
											</div>
										</div>
									{/if}

									<!-- 黑名单内容 -->
									{#if filter.activeTab === 'blacklist'}
										<div
											class="space-y-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950"
										>
											<p class="text-[10px] text-red-700 dark:text-red-300">
												排除匹配的视频（优先级高于白名单）
											</p>

											<!-- 添加黑名单关键词 -->
											<div class="flex gap-1">
												<Input
													bind:value={filter.newBlacklist}
													placeholder="输入关键词"
													onkeydown={filter.handleBlacklistKeydown}
													disabled={filter.validatingBlacklist}
													class="h-8 flex-1 text-xs"
												/>
												<Button
													type="button"
													size="sm"
													onclick={filter.addBlacklist}
													disabled={!filter.newBlacklist.trim() || filter.validatingBlacklist}
													class="h-8 bg-red-600 px-2 text-xs hover:bg-red-700"
												>
													{filter.validatingBlacklist ? '...' : '添加'}
												</Button>
											</div>
											{#if filter.blacklistError}
												<p class="text-[10px] text-red-500">{filter.blacklistError}</p>
											{/if}

											<!-- 黑名单列表 -->
											<div class="max-h-32 space-y-1 overflow-y-auto">
												{#if filter.blacklist.length === 0}
													<p
														class="py-2 text-center text-[10px] text-red-600 italic dark:text-red-400"
													>
														暂无黑名单关键词
													</p>
												{:else}
													{#each filter.blacklist as keyword, index (keyword)}
														<div
															class="flex items-center justify-between rounded bg-red-100 px-2 py-1 dark:bg-red-900"
														>
															<code
																class="flex-1 truncate text-[10px] text-red-800 dark:text-red-200"
																>{keyword}</code
															>
															<button
																type="button"
																onclick={() => filter.removeBlacklist(index)}
																class="ml-1 flex-shrink-0 rounded p-0.5 text-red-600 hover:bg-red-200 hover:text-red-800 dark:hover:bg-red-800"
																title="删除"
															>
																<X class="h-3 w-3" />
															</button>
														</div>
													{/each}
												{/if}
											</div>
										</div>
									{/if}

									<!-- 正则表达式示例 -->
									<div
										class="rounded border border-purple-200 bg-white p-2 dark:border-purple-700 dark:bg-gray-800"
									>
										<p class="text-xs font-medium text-purple-700 dark:text-purple-300">
											正则表达式示例：
										</p>
										<ul class="mt-1 space-y-0.5 text-[10px] text-purple-600 dark:text-purple-400">
											<li>
												<code class="rounded bg-purple-100 px-1 dark:bg-purple-800">PV</code> - 匹配包含"PV"的标题
											</li>
											<li>
												<code class="rounded bg-purple-100 px-1 dark:bg-purple-800">预告</code> - 匹配包含"预告"的标题
											</li>
											<li>
												<code class="rounded bg-purple-100 px-1 dark:bg-purple-800">第\d+期</code> -
												匹配"第N期"格式
											</li>
										</ul>
										<p class="mt-1 text-[10px] text-purple-500 dark:text-purple-400">
											示例：白名单添加"PV"，黑名单添加"预告"，则下载含"PV"但不含"预告"的视频
										</p>
									</div>
								</div>
							{/if}
						</div>

						<!-- 提交按钮 -->
						<div class="flex {isMobile ? 'flex-col' : ''} gap-2">
							<Button
								type="submit"
								disabled={loading || batch.mode}
								class={isMobile ? 'w-full' : ''}
							>
								{loading ? '添加中...' : '添加'}
							</Button>
							<Button
								type="button"
								variant="outline"
								onclick={() => goto(resolve('/video-sources'))}
								class={isMobile ? 'w-full' : ''}
							>
								取消
							</Button>
						</div>
					</form>
				</div>

				<!-- 右侧：搜索结果区域 -->
				{#if search.open && search.results.length > 0}
					<SearchResultsPanel
						{isCompactLayout}
						{isMobile}
						batchMode={batch.mode}
						{sourceType}
						searchResults={search.results}
						searchTotalResults={search.total}
						{filteredSearchResults}
						batchCheckboxStates={batch.checkboxStates}
						{enableSearchAnimations}
						{isBangumiSeasonExists}
						{isSubmissionExists}
						isBatchSelected={(key) => batch.isSelected(key)}
						onClose={() => {
							search.open = false;
							search.results = [];
							search.total = 0;
						}}
						onSelectAll={() => selectAllVisible('search')}
						onSelectResult={selectSearchResult}
						onToggleBatch={(key, result) => batch.toggle(key, result, 'search')}
						onMouseEnter={(result, e) => hover.show('search', result, e)}
						onMouseLeave={() => hover.hide()}
						onMouseMove={(e) => hover.move(e)}
					/>
				{/if}

				<!-- 关注UP主列表（移动到右侧） -->
				{#if (sourceType === 'collection' || sourceType === 'submission') && userFollowings.length > 0}
					<div class={isCompactLayout ? 'w-full' : 'flex-1'}>
						<SidePanel
							isMobile={isCompactLayout}
							title="关注的UP主"
							subtitle={`共 ${userFollowings.length} 个UP主`}
							maxHeightClass="max-h-126"
							headerClass="bg-blue-50 dark:bg-blue-950"
							titleClass="text-base font-medium text-blue-800 dark:text-blue-200"
							subtitleClass="text-sm text-blue-600 dark:text-blue-400"
							showActions={batch.mode}
						>
							{#snippet actions()}
								<SelectAllButton onclick={() => selectAllVisible('following')} />
							{/snippet}

							<div
								class="grid gap-3 {isMobile ? 'grid-cols-1' : ''}"
								style={isMobile
									? ''
									: 'grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));'}
							>
								{#each filteredUserFollowings as following (following.mid)}
									{@const itemKey = `following_${following.mid}`}
									{@const isDisabled =
										sourceType === 'submission' && existingSubmissionIds.has(following.mid)}
									<SelectableCardButton
										onclick={() => {
											if (batch.mode) {
												batch.toggle(itemKey, following, 'following');
											} else {
												selectFollowing(following);
											}
										}}
										disabled={isDisabled}
										selected={batch.mode && batch.isSelected(itemKey)}
										class="p-3"
									>
										<div class="flex items-start gap-2">
											<!-- 批量模式下的复选框 -->
											{#if batch.mode}
												<BatchCheckbox
													checked={batch.checkboxStates[itemKey] || false}
													onclick={(e) => {
														e.stopPropagation();
														batch.toggle(itemKey, following, 'following');
													}}
												/>
											{/if}
											<BiliImage
												src={following.face}
												alt={following.name}
												class="object-form.cover h-10 w-10 flex-shrink-0 rounded-full"
												placeholder="头像"
											/>
											<div class="min-w-0 flex-1">
												<div class="mb-1 flex items-center gap-1">
													<h4 class="truncate text-xs font-medium">{following.name}</h4>
													{#if following.official_verify && following.official_verify.type >= 0}
														<span
															class="flex-shrink-0 rounded bg-yellow-100 px-1 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
														>
															V
														</span>
													{/if}
													{#if sourceType === 'submission' && existingSubmissionIds.has(following.mid)}
														<span
															class="flex-shrink-0 rounded bg-gray-100 px-1 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
														>
															已添加
														</span>
													{/if}
												</div>
												<p class="text-muted-foreground mb-1 truncate text-xs">
													UID: {following.mid}{#if following.follower !== undefined && following.follower !== null}
														<span class="ml-2"
															>· 粉丝: {formatSubmissionMetricLabel(following.follower)}</span
														>
													{/if}
												</p>
												{#if following.sign}
													<p class="text-muted-foreground line-clamp-1 text-xs">
														{following.sign}
													</p>
												{/if}
											</div>
										</div>
									</SelectableCardButton>
								{/each}
							</div>
						</SidePanel>
					</div>
				{/if}

				<!-- UP主合集列表（移动到右侧） -->
				{#if sourceType === 'collection' && userCollections.length > 0}
					<div class={isCompactLayout ? 'w-full' : 'flex-1'}>
						<SidePanel
							isMobile={isCompactLayout}
							title="UP主合集列表"
							subtitle={`共 ${userCollections.length} 个合集`}
							headerClass="bg-green-50 dark:bg-green-950"
							titleClass="text-base font-medium text-green-800 dark:text-green-200"
							subtitleClass="text-sm text-green-600 dark:text-green-400"
							showActions={batch.mode}
						>
							{#snippet actions()}
								<SelectAllButton onclick={() => selectAllVisible('collection')} />
							{/snippet}

							<div
								class="grid gap-4 {isMobile ? 'grid-cols-1' : ''}"
								style={isMobile
									? ''
									: 'grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));'}
							>
								{#each filteredUserCollections as collection (`${collection.sid}_${normalizeCollectionType(collection.collection_type)}`)}
									{@const itemKey = `collection_${collection.sid}_${normalizeCollectionType(collection.collection_type)}`}
									{@const isDisabled = isCollectionExists(
										collection.sid,
										collection.mid.toString(),
										collection.collection_type
									)}
									<SelectableCardButton
										onclick={() => {
											if (batch.mode) {
												batch.toggle(itemKey, collection, 'collection');
											} else {
												selectCollection(collection);
											}
										}}
										disabled={isDisabled}
										selected={batch.mode && batch.isSelected(itemKey)}
										class="p-4"
									>
										<div class="flex items-start gap-3">
											<!-- 批量模式下的复选框 -->
											{#if batch.mode}
												<BatchCheckbox
													checked={batch.checkboxStates[itemKey] || false}
													onclick={(e) => {
														e.stopPropagation();
														batch.toggle(itemKey, collection, 'collection');
													}}
												/>
											{/if}
											<BiliImage
												src={collection.cover}
												alt={collection.name}
												class="object-form.cover h-16 w-24 flex-shrink-0 rounded"
												placeholder="无封面"
											/>
											<div class="min-w-0 flex-1">
												<div class="mb-1 flex items-center gap-2">
													<h4 class="truncate text-sm font-medium">{collection.name}</h4>
													<span
														class="flex-shrink-0 rounded px-2 py-0.5 text-xs {collection.collection_type ===
														'season'
															? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
															: 'bg-blue-100 text-blue-700'}"
													>
														{collection.collection_type === 'season' ? '合集' : '系列'}
													</span>
													{#if isCollectionExists(collection.sid, collection.mid.toString(), collection.collection_type)}
														<span
															class="flex-shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
														>
															已添加
														</span>
													{/if}
												</div>
												<p class="text-muted-foreground mb-1 text-xs">
													ID: {collection.sid} (检查key:
													{buildCollectionIdentityKey(
														collection.sid,
														collection.mid.toString(),
														collection.collection_type
													)})
												</p>
												<p class="text-muted-foreground text-xs">共 {collection.total} 个视频</p>
												{#if collection.description}
													<p class="text-muted-foreground mt-1 line-clamp-2 text-xs">
														{collection.description}
													</p>
												{/if}
											</div>
										</div>
									</SelectableCardButton>
								{/each}
							</div>
						</SidePanel>
					</div>
				{/if}

				<!-- 收藏夹列表（移动到右侧） -->
				{#if sourceType === 'favorite' && userFavorites.length > 0}
					<div class={isCompactLayout ? 'w-full' : 'flex-1'}>
						<SidePanel
							isMobile={isCompactLayout}
							title="我的收藏夹"
							subtitle={`共 ${userFavorites.length} 个收藏夹`}
							headerClass="bg-yellow-50 dark:bg-yellow-950"
							titleClass="text-base font-medium text-yellow-800 dark:text-yellow-200"
							subtitleClass="text-sm text-yellow-600 dark:text-yellow-400"
							showActions={batch.mode}
						>
							{#snippet actions()}
								<SelectAllButton onclick={() => selectAllVisible('favorite')} />
							{/snippet}

							<div
								class="grid gap-4 {isMobile ? 'grid-cols-1' : ''}"
								style={isMobile
									? ''
									: 'grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));'}
							>
								{#each filteredUserFavorites as favorite (favorite.id)}
									{@const itemKey = `favorite_${favorite.id}`}
									{@const isDisabled = existingFavoriteIds.has(Number(favorite.id))}
									<SelectableCardButton
										onclick={() => {
											if (batch.mode) {
												batch.toggle(itemKey, favorite, 'favorite');
											} else {
												selectFavorite(favorite);
											}
										}}
										disabled={isDisabled}
										selected={batch.mode && batch.isSelected(itemKey)}
										class="p-4"
									>
										<div class="flex items-start gap-3">
											<!-- 批量模式下的复选框 -->
											{#if batch.mode}
												<BatchCheckbox
													checked={batch.checkboxStates[itemKey] || false}
													onclick={(e) => {
														e.stopPropagation();
														batch.toggle(itemKey, favorite, 'favorite');
													}}
												/>
											{/if}
											<BiliImage
												src={favorite.cover}
												alt={getFavoriteDisplayName(favorite)}
												class="object-form.cover h-16 w-24 flex-shrink-0 rounded"
												placeholder="无封面"
											/>
											<div class="min-w-0 flex-1">
												<div class="mb-1 flex items-center gap-2">
													<h4 class="truncate text-sm font-medium">
														{getFavoriteDisplayName(favorite)}
													</h4>
													{#if existingFavoriteIds.has(Number(favorite.id))}
														<span
															class="flex-shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
														>
															已添加
														</span>
													{/if}
												</div>
												<p class="text-muted-foreground mb-1 text-xs">收藏夹ID: {favorite.id}</p>
												<p class="text-muted-foreground mb-1 text-xs">
													共 {favorite.media_count} 个视频
												</p>
												{#if favorite.created}
													<p class="text-muted-foreground text-xs">
														创建于 {formatTimestamp(favorite.created, 'Asia/Shanghai', 'date')}
													</p>
												{/if}
											</div>
										</div>
									</SelectableCardButton>
								{/each}
							</div>
						</SidePanel>
					</div>
				{/if}

				<!-- UP主收藏夹列表（移动到右侧） -->
				{#if sourceType === 'favorite' && selectedUserId && (searchedUserFavorites.length > 0 || loadingSearchedUserFavorites)}
					<div class={isCompactLayout ? 'w-full' : 'flex-1'}>
						<SidePanel
							isMobile={isCompactLayout}
							title={`${selectedUserName} 的收藏夹`}
							subtitle={loadingSearchedUserFavorites
								? '正在加载...'
								: searchedUserFavorites.length > 0
									? `共 ${searchedUserFavorites.length} 个收藏夹`
									: '没有公开收藏夹'}
							headerClass="bg-green-50 dark:bg-green-950"
							titleClass="text-base font-medium text-green-800 dark:text-green-200"
							subtitleClass="text-sm text-green-600 dark:text-green-400"
						>
							{#snippet actions()}
								{#if batch.mode && searchedUserFavorites.length > 0}
									<SelectAllButton onclick={() => selectAllVisible('searched-favorite')} />
								{/if}
								<button
									onclick={clearSearchedUserFavoritesSelection}
									class="p-1 text-xl text-green-500 hover:text-green-700 dark:text-green-300"
								>
									<X class="h-5 w-5" />
								</button>
							{/snippet}

							{#if loadingSearchedUserFavorites}
								<div class="p-4 text-center">
									<Loading
										size="sm"
										text="正在获取收藏夹列表..."
										textClass="text-sm text-green-700 dark:text-green-300"
									/>
								</div>
							{:else if searchedUserFavorites.length > 0}
								<div
									class="grid gap-4 {isMobile ? 'grid-cols-1' : ''}"
									style={isMobile
										? ''
										: 'grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));'}
								>
									{#each filteredSearchedUserFavorites as favorite (favorite.id)}
										{@const itemKey = `searched-favorite_${favorite.id}`}
										{@const isDisabled = existingFavoriteIds.has(Number(favorite.id))}
										<SelectableCardButton
											onclick={() => {
												if (batch.mode) {
													batch.toggle(itemKey, favorite, 'favorite');
												} else {
													selectSearchedFavorite(favorite);
												}
											}}
											disabled={isDisabled}
											selected={batch.mode && batch.isSelected(itemKey)}
											class="p-4"
										>
											<div class="flex items-start gap-3">
												<!-- 批量模式下的复选框 -->
												{#if batch.mode}
													<BatchCheckbox
														checked={batch.checkboxStates[itemKey] || false}
														onclick={(e) => {
															e.stopPropagation();
															batch.toggle(itemKey, favorite, 'favorite');
														}}
													/>
												{/if}
												<div
													class="bg-muted text-muted-foreground flex h-16 w-24 flex-shrink-0 items-center justify-center rounded text-xs"
												>
													收藏夹
												</div>
												<div class="min-w-0 flex-1">
													<div class="mb-1 flex items-center gap-2">
														<h4 class="truncate text-sm font-medium">{favorite.title}</h4>
														{#if existingFavoriteIds.has(Number(favorite.id))}
															<span
																class="flex-shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
															>
																已添加
															</span>
														{/if}
													</div>
													<p class="text-muted-foreground mb-1 text-xs">
														收藏夹ID: {favorite.id}
													</p>
													<p class="text-muted-foreground text-xs">
														共 {favorite.media_count} 个视频
													</p>
												</div>
											</div>
										</SelectableCardButton>
									{/each}
								</div>
							{:else}
								<EmptyState
									icon={InfoIcon}
									title="没有公开收藏夹"
									description="该UP主没有公开收藏夹，或网络错误"
									class="m-2"
								>
									{#snippet actions()}
										<Button
											type="button"
											size="sm"
											variant="outline"
											onclick={clearSearchedUserFavoritesSelection}
										>
											重新选择UP主
										</Button>
									{/snippet}
								</EmptyState>
							{/if}
						</SidePanel>
					</div>
				{/if}

				<!-- 番剧季度选择区域（移动到右侧） -->
				{#if sourceType === 'bangumi' && form.sourceId && !form.downloadAllSeasons && (bangumi.loading || bangumi.seasons.length > 1 || (bangumi.fetchAttempted && bangumi.seasons.length === 0))}
					<div class={isCompactLayout ? 'w-full' : 'flex-1'}>
						<SidePanel
							isMobile={isCompactLayout}
							title="选择要下载的季度"
							subtitle={bangumi.loading
								? '正在加载...'
								: bangumi.seasons.length > 0
									? `共 ${bangumi.seasons.length} 个相关季度`
									: '暂无季度信息'}
							headerClass="bg-purple-50 dark:bg-purple-950"
							titleClass="text-base font-medium text-purple-800 dark:text-purple-200"
							subtitleClass="text-sm text-purple-600 dark:text-purple-400"
							bodyClass="flex-1 overflow-hidden p-3"
							showActions={bangumi.selected.length > 0}
						>
							{#snippet actions()}
								<span
									class="rounded bg-purple-100 px-2 py-1 text-xs text-purple-700 dark:bg-purple-900 dark:text-purple-300"
								>
									已选择 {bangumi.selected.length} 个
									{#if bangumi.selected.length === bangumi.seasons.length}
										（全部）
									{/if}
								</span>
							{/snippet}

							{#if bangumi.loading}
								<div class="p-4 text-center">
									<div class="text-sm text-purple-700 dark:text-purple-300">
										正在加载季度信息...
									</div>
								</div>
							{:else if bangumi.seasons.length > 0}
								<div class="seasons-grid-container">
									<div
										class="grid gap-4 {isMobile ? 'grid-cols-1' : ''}"
										style={isMobile
											? ''
											: 'grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));'}
									>
										{#each filteredBangumiSeasons as season, i (season.season_id)}
											<div
												role="button"
												tabindex="0"
												class="relative rounded-lg border p-4 transition-all duration-300 {season.isExisting
													? 'cursor-not-allowed bg-gray-50 opacity-60 dark:bg-gray-800'
													: 'transform cursor-pointer hover:scale-102 hover:bg-purple-50 hover:shadow-md dark:hover:bg-purple-900'} {isMobile
													? 'h-auto'
													: 'h-[120px]'}"
												onmouseenter={(e) => !season.isExisting && hover.show('season', season, e)}
												onmouseleave={!season.isExisting ? () => hover.hide() : undefined}
												onmousemove={!season.isExisting ? (e) => hover.move(e) : undefined}
												onclick={() => !season.isExisting && bangumi.toggleSeason(season.season_id)}
												onkeydown={(e) =>
													!season.isExisting &&
													(e.key === 'Enter' || e.key === ' ') &&
													bangumi.toggleSeason(season.season_id)}
												transition:fly={{
													y: 50,
													duration: enableSeasonAnimations ? 300 : 0,
													delay: enableSeasonAnimations ? i * 100 : 0
												}}
												animate:flip={{ duration: enableSeasonAnimations ? 300 : 0 }}
											>
												<div class="flex gap-3 {isMobile ? '' : 'h-full'}">
													<BiliImage
														src={season.cover}
														alt={season.season_title}
														class="object-form.cover h-20 w-14 flex-shrink-0 rounded"
														placeholder="无封面"
													/>
													<div class="min-w-0 flex-1">
														<div class="absolute top-3 right-3">
															<input
																type="checkbox"
																id="season-{season.season_id}"
																checked={bangumi.selected.includes(season.season_id)}
																disabled={season.isExisting}
																onchange={() => bangumi.toggleSeason(season.season_id)}
																class="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 {season.isExisting
																	? 'cursor-not-allowed opacity-50'
																	: ''}"
															/>
														</div>
														<!-- 右下角集数标签 -->
														{#if season.episode_count}
															<div class="absolute right-3 bottom-3">
																<span
																	class="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700 dark:bg-purple-900 dark:text-purple-300"
																	>{season.episode_count}集</span
																>
															</div>
														{/if}
														<label for="season-{season.season_id}" class="cursor-pointer">
															<h4 class="truncate pr-6 text-sm font-medium">
																{season.full_title || season.season_title}
															</h4>
															{#if season.season_id === form.sourceId}
																<span
																	class="mt-1 inline-block rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700 dark:bg-purple-900 dark:text-purple-300"
																	>当前</span
																>
															{/if}
															{#if season.isExisting}
																<span
																	class="mt-1 ml-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
																	>已添加</span
																>
															{/if}
															<p class="text-muted-foreground mt-1 text-xs">
																Season ID: {season.season_id}
															</p>
															{#if season.media_id}
																<p class="text-muted-foreground text-xs">
																	Media ID: {season.media_id}
																</p>
															{/if}
														</label>
													</div>
												</div>
											</div>
										{/each}
									</div>
								</div>
								{#if !bangumi.loading && bangumi.seasons.length > 0}
									<p class="mt-3 text-center text-xs text-purple-600">
										不选择则仅下载{isCompactLayout ? '上方' : '左侧'}输入的当前季度
									</p>
								{/if}
							{:else if form.sourceId}
								<EmptyState
									icon={InfoIcon}
									title="暂无季度信息"
									description="请检查 Season ID 是否正确"
									class="m-2"
								>
									{#snippet actions()}
										<Button
											type="button"
											size="sm"
											variant="outline"
											onclick={bangumi.fetchSeasons}
										>
											重新获取
										</Button>
									{/snippet}
								</EmptyState>
							{/if}
						</SidePanel>
					</div>
				{/if}

				<!-- 课程（pugv）选择区域：选中讲师后列出其名下全部课程 -->
				{#if sourceType === 'pugv' && pugv.upMid && (pugv.loading || pugv.courses.length > 0 || pugv.fetchAttempted)}
					<div class={isCompactLayout ? 'w-full' : 'flex-1'}>
						<SidePanel
							isMobile={isCompactLayout}
							title={`${pugv.upName || pugv.upMid} 的课程`}
							subtitle={pugv.loading
								? '正在加载...'
								: pugv.courses.length > 0
									? `共 ${pugv.courses.length} 门课程`
									: '未找到课程'}
							headerClass="bg-indigo-50 dark:bg-indigo-950"
							titleClass="text-base font-medium text-indigo-800 dark:text-indigo-200"
							subtitleClass="text-sm text-indigo-600 dark:text-indigo-400"
							bodyClass="flex-1 overflow-hidden p-3"
						>
							{#snippet actions()}
								{#if pugv.courses.length > 0}
									<Button
										type="button"
										size="sm"
										variant="outline"
										class="h-7 px-2 text-xs"
										onclick={pugv.toggleAll}
									>
										{pugv.selectedSeasonIds.length > 0 ? '取消全选' : '全选'}
									</Button>
									<span
										class="rounded bg-indigo-100 px-2 py-1 text-xs text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
									>
										已选 {pugv.selectedSeasonIds.length} 门
									</span>
								{/if}
								<button
									onclick={pugv.clear}
									class="p-1 text-xl text-indigo-500 hover:text-indigo-700 dark:text-indigo-300"
								>
									<X class="h-5 w-5" />
								</button>
							{/snippet}

							{#if pugv.loading}
								<div class="p-4 text-center">
									<div class="text-sm text-indigo-700 dark:text-indigo-300">
										正在加载课程列表...
									</div>
								</div>
							{:else if pugv.courses.length > 0}
								<div
									class="grid gap-4 {isMobile ? 'grid-cols-1' : ''}"
									style={isMobile
										? ''
										: 'grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));'}
								>
									{#each pugv.courses as course (course.season_id)}
										{@const isExisting = pugv.existingSeasonIds.has(course.season_id)}
										<div
											role="button"
											tabindex="0"
											class="relative rounded-lg border p-4 transition-all duration-300 {isExisting
												? 'cursor-not-allowed bg-gray-50 opacity-60 dark:bg-gray-800'
												: pugv.selectedSeasonIds.includes(course.season_id)
													? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950'
													: 'cursor-pointer hover:scale-102 hover:bg-indigo-50 hover:shadow-md dark:hover:bg-indigo-900'} {isMobile
												? 'h-auto'
												: 'h-[120px]'}"
											onclick={() => !isExisting && pugv.toggleSeason(course.season_id)}
											onkeydown={(e) =>
												!isExisting &&
												(e.key === 'Enter' || e.key === ' ') &&
												pugv.toggleSeason(course.season_id)}
										>
											<div class="flex gap-3 {isMobile ? '' : 'h-full'}">
												<BiliImage
													src={course.cover || undefined}
													alt={course.title}
													class="object-form.cover h-20 w-14 flex-shrink-0 rounded"
													placeholder="无封面"
												/>
												<div class="min-w-0 flex-1">
													<div class="absolute top-3 right-3">
														<input
															type="checkbox"
															id="pugv-course-{course.season_id}"
															checked={pugv.selectedSeasonIds.includes(course.season_id)}
															disabled={isExisting}
															onchange={() => pugv.toggleSeason(course.season_id)}
															class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 {isExisting
																? 'cursor-not-allowed opacity-50'
																: ''}"
														/>
													</div>
													{#if course.episode_count}
														<div class="absolute right-3 bottom-3">
															<span
																class="rounded bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
																>{course.episode_count}课时</span
															>
														</div>
													{/if}
													<label for="pugv-course-{course.season_id}" class="cursor-pointer">
														<h4 class="truncate pr-6 text-sm font-medium" title={course.title}>
															{course.title}
														</h4>
														{#if isExisting}
															<span
																class="mt-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
																>已添加</span
															>
														{/if}
														<p class="text-muted-foreground mt-1 text-xs">
															课程 ID: {course.season_id}
														</p>
														{#if course.status}
															<p class="text-muted-foreground text-xs">{course.status}</p>
														{/if}
													</label>
												</div>
											</div>
										</div>
									{/each}
								</div>
								<p class="mt-3 text-center text-xs text-indigo-600">
									勾选要下载的课程；不勾选则添加该 UP 主的全部课程
								</p>
							{:else}
								<EmptyState
									icon={InfoIcon}
									title="没有找到课程"
									description="该 UP 主名下没有公开课程，可换一个讲师账号试试"
									class="m-2"
								>
									{#snippet actions()}
										<Button type="button" size="sm" variant="outline" onclick={pugv.fetchCourses}>
											重新获取
										</Button>
									{/snippet}
								</EmptyState>
							{/if}
						</SidePanel>
					</div>
				{/if}

				<!-- 订阅的合集列表（仅合集类型时显示） -->
				{#if sourceType === 'collection' && subscribedCollections.length > 0}
					<div class={isCompactLayout ? 'w-full' : 'flex-1'}>
						<SidePanel
							isMobile={isCompactLayout}
							title="关注的合集"
							subtitle={`共 ${subscribedCollections.length} 个合集`}
							maxHeightClass="max-h-96"
							headerClass="bg-purple-50 dark:bg-purple-950"
							titleClass="text-base font-medium text-purple-800 dark:text-purple-200"
							subtitleClass="text-sm text-purple-600 dark:text-purple-400"
							showActions={batch.mode}
						>
							{#snippet actions()}
								<SelectAllButton onclick={() => selectAllVisible('subscribed-collection')} />
							{/snippet}

							<div
								class="grid gap-4 {isMobile ? 'grid-cols-1' : ''}"
								style={isMobile
									? ''
									: 'grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));'}
							>
								{#each subscribedCollections as collection (`${collection.sid}_${collection.collection_type || 'season'}`)}
									{@const itemKey = `subscribed-collection_${collection.sid}_${collection.collection_type || 'season'}`}
									{@const isExisting =
										collection.collection_type === 'favorite'
											? existingFavoriteIds.has(Number(collection.sid))
											: isCollectionExists(
													collection.sid,
													collection.up_mid.toString(),
													collection.collection_type
												)}
									<SelectableCardButton
										onclick={() => {
											if (batch.mode) {
												batch.toggle(
													itemKey,
													collection,
													collection.collection_type === 'favorite' ? 'favorite' : 'collection'
												);
											} else {
												selectSubscribedCollection(collection);
											}
										}}
										disabled={isExisting}
										selected={batch.mode && batch.isSelected(itemKey)}
										class="p-4"
									>
										<div class="flex items-start gap-3">
											<!-- 批量模式下的复选框 -->
											{#if batch.mode}
												<BatchCheckbox
													checked={batch.checkboxStates[itemKey] || false}
													onclick={(e) => {
														e.stopPropagation();
														batch.toggle(
															itemKey,
															collection,
															collection.collection_type === 'favorite' ? 'favorite' : 'collection'
														);
													}}
												/>
											{/if}
											<BiliImage
												src={collection.cover}
												alt={collection.name}
												class="object-form.cover h-16 w-24 flex-shrink-0 rounded"
												placeholder={collection.collection_type === 'favorite'
													? '收藏夹'
													: '无封面'}
											/>
											<div class="min-w-0 flex-1">
												<div class="mb-1 flex items-center gap-2">
													<h4 class="truncate text-sm font-medium">{collection.name}</h4>
													<span
														class="flex-shrink-0 rounded px-2 py-0.5 text-xs {collection.collection_type ===
														'favorite'
															? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
															: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'}"
													>
														{collection.collection_type === 'favorite' ? '收藏夹' : '合集'}
													</span>
													{#if isExisting}
														<span
															class="flex-shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
														>
															已添加
														</span>
													{/if}
												</div>
												<p class="text-muted-foreground mb-1 text-xs">ID: {collection.sid}</p>
												<p class="text-muted-foreground mb-1 text-xs">
													UP主: {collection.up_name}
												</p>
												<p class="text-muted-foreground text-xs">共 {collection.total} 个视频</p>
												{#if collection.description}
													<p class="text-muted-foreground mt-1 line-clamp-2 text-xs">
														{collection.description}
													</p>
												{/if}
											</div>
										</div>
									</SelectableCardButton>
								{/each}
							</div>
						</SidePanel>
					</div>
				{/if}

				<!-- B站投稿内容选择面板 -->
				{#if sourceType === 'submission' && submission.open}
					<SubmissionSelectionPanel {isCompactLayout} {isMobile} store={submission} />
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- 批量操作工具栏 -->
{#if batch.mode && batch.selectedItems.size > 0}
	<BatchActionBar
		{isMobile}
		selectedCount={batch.selectedItems.size}
		adding={batch.adding}
		progress={batch.progress}
		onClear={() => batch.clear()}
		onOpenDialog={() => batch.openDialog()}
	/>
{/if}

<!-- 统一的悬停详情框 -->
<HoverDetailCard
	hoveredItem={hover.item}
	mousePosition={hover.position}
	{sourceType}
	sourceId={form.sourceId}
	selectedSeasons={bangumi.selected}
/>

<!-- 批量添加配置对话框 -->
<BatchConfigDialog
	open={batch.dialogOpen}
	selectedItems={batch.selectedItems}
	bind:batchBasePath={batch.basePath}
	selectedTemplate={batchSelectedTemplate}
	bind:filterOptionInheritGlobal={options.filterOptionInheritGlobal}
	bind:filterOptionDraft={options.filterOptionDraft}
	bind:collectionAggregateEnabled={batch.collectionAggregateEnabled}
	adding={batch.adding}
	selectedSourceType={batch.selectedSourceType}
	canStart={batch.canStart}
	getPathForItem={batch.getPathForItem}
	getItemTypeLabel={batch.getItemTypeLabel}
	onStart={startBatchAdd}
	onCancel={() => batch.closeDialog()}
/>

<style>
	/* 限制描述文字的行数 */
	.line-clamp-2 {
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	/* 悬停动画效果 */
	.hover\:scale-102:hover {
		transform: scale(1.02);
	}

	.transform {
		transition:
			transform 0.3s ease,
			box-shadow 0.3s ease;
	}

	/* 季度网格容器滚动样式 */
	.seasons-grid-container {
		max-height: calc(120px * 5 + 1rem * 4); /* 5个横向行，每行120px高度，4个行间隔 */
		overflow-y: auto;
		padding-right: 0.5rem;
	}

	.seasons-grid-container::-webkit-scrollbar {
		width: 6px;
	}

	.seasons-grid-container::-webkit-scrollbar-track {
		background: #f1f1f1;
		border-radius: 3px;
	}

	.seasons-grid-container::-webkit-scrollbar-thumb {
		background: #c1c1c1;
		border-radius: 3px;
	}

	.seasons-grid-container::-webkit-scrollbar-thumb:hover {
		background: #a1a1a1;
	}
</style>
