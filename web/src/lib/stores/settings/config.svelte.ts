import { toast } from 'svelte-sonner';
import api from '$lib/api';
import { runRequest } from '$lib/utils/request.js';
import { normalizeConcurrencyValue, normalizeNumberInput } from '$lib/utils/number';
import type { ConfigResponse, UpdateConfigRequest } from '$lib/types';
import type { SettingsNamingStore } from './naming.svelte';
import type { CaptchaSettingsStore } from './captcha.svelte';

export const DEFAULT_CONFIG_VALUES = {
	interval: 1200,
	nfoIncludeGenre: true,
	bindAddress: '0.0.0.0:12345',
	parallelDownloadThreads: 4,
	codecs: ['AVC', 'HEV', 'AV1'],
	danmakuDuration: 15.0,
	danmakuFontSize: 25,
	danmakuWidthRatio: 1.2,
	danmakuHorizontalGap: 20.0,
	danmakuLaneSize: 32,
	danmakuFloatPercentage: 0.5,
	danmakuBottomPercentage: 0.3,
	danmakuOpacity: 76,
	danmakuOutline: 0.8,
	danmakuTimeOffset: 0.0,
	danmakuUpdateFreshDays: 3,
	danmakuUpdateFreshIntervalHours: 6,
	danmakuUpdateMatureDays: 30,
	danmakuUpdateMatureIntervalDays: 3,
	danmakuUpdateColdDays: 180,
	danmakuUpdateColdIntervalDays: 30,
	concurrentVideo: 3,
	concurrentPage: 2,
	rateLimit: 4,
	rateDuration: 250,
	largeSubmissionThreshold: 80,
	baseRequestDelay: 1000,
	largeSubmissionDelayMultiplier: 2,
	maxDelayMultiplier: 4,
	batchSize: 3,
	batchDelaySeconds: 2,
	autoBackoffBaseSeconds: 10,
	autoBackoffMaxMultiplier: 5,
	sourceDelaySeconds: 2,
	submissionSourceDelaySeconds: 5,
	dynamicApiDelayMultiplier: 1.5,
	largeSourceDownloadThreshold: 1000,
	largeSourceDownloadPageThreshold: 1000,
	largeSourceMaxVideosPerRound: 0,
	largeSourceMaxPagesPerRound: 2000,
	largeSourceConcurrentVideo: 1,
	largeSourceConcurrentPage: 1,
	largeSourcePlayurlLimit: 1,
	largeSourcePlayurlDurationMs: 1000,
	aria2HealthCheckInterval: 300
} as const;

/** 校验服务器绑定地址，返回错误文案（空串表示通过） */
function validateBindAddressValue(value: string): string {
	const trimmedValue = value.trim();
	if (!trimmedValue) return '';

	if (trimmedValue.includes(':')) {
		const parts = trimmedValue.split(':');
		if (parts.length !== 2) return '绑定地址格式错误，应为 "IP:端口" 或 "端口"';
		const port = parseInt(parts[1]);
		if (isNaN(port) || port < 1 || port > 65535) return '端口号必须是1-65535之间的数字';
		return '';
	}

	const port = parseInt(trimmedValue);
	if (isNaN(port) || port < 1 || port > 65535) return '端口号必须是1-65535之间的数字';
	return '';
}

export type MainConfigContext = {
	/** 保存成功后关闭当前抽屉 */
	closeSheet: () => void;
	/** 命名模板校验与载荷由命名域提供 */
	naming: SettingsNamingStore;
	/** 风控字段与主配置一起提交 */
	captcha: CaptchaSettingsStore;
};

/**
 * 主配置域：画质 / 下载 / 弹幕 / 系统路径 / 投稿风控 / aria2。
 * 这些分组共用一个配置接口和保存按钮，所以集中在一个 store 里，避免保存逻辑分散。
 */
export class MainConfigStore {
	// 基础与下载
	interval = $state(1200);
	bindAddress = $state<string>(DEFAULT_CONFIG_VALUES.bindAddress);
	parallelDownloadEnabled = $state(false);
	parallelDownloadThreads = $state(4);
	parallelDownloadUseAria2 = $state(false);

	// 视频质量
	videoMaxQuality = $state('Quality8k');
	videoMinQuality = $state('Quality360p');
	audioMaxQuality = $state('QualityHiRES');
	audioMinQuality = $state('Quality64k');
	codecs = $state<string[]>(['AVC', 'HEV', 'AV1']);
	noDolbyVideo = $state(false);
	noDolbyAudio = $state(false);
	noHdr = $state(false);
	noHires = $state(false);

	// 弹幕
	danmakuDuration = $state(15.0);
	danmakuFont = $state('黑体');
	danmakuFontSize = $state(25);
	danmakuWidthRatio = $state(1.2);
	danmakuHorizontalGap = $state(20.0);
	danmakuLaneSize = $state(32);
	danmakuFloatPercentage = $state(0.5);
	danmakuBottomPercentage = $state(0.3);
	danmakuOpacity = $state(76);
	danmakuBold = $state(true);
	danmakuOutline = $state(0.8);
	danmakuTimeOffset = $state(0.0);
	danmakuUpdateEnabled = $state(false);
	danmakuUpdateFreshDays = $state(3);
	danmakuUpdateFreshIntervalHours = $state(6);
	danmakuUpdateMatureDays = $state(30);
	danmakuUpdateMatureIntervalDays = $state(3);
	danmakuUpdateColdDays = $state(180);
	danmakuUpdateColdIntervalDays = $state(30);

	// 并发控制
	concurrentVideo = $state(3);
	concurrentPage = $state(2);
	rateLimit = $state(4);
	rateDuration = $state(250);

	// 系统与其他
	cdnSorting = $state(false);
	scanDeletedVideos = $state(false);
	upperPath = $state('');
	favoriteQuickSubscribePath = $state('');
	collectionQuickSubscribePath = $state('');
	submissionQuickSubscribePath = $state('');
	bangumiQuickSubscribePath = $state('');
	pugvQuickSubscribePath = $state('');
	ffmpegPath = $state('');

	// 投稿风控
	largeSubmissionThreshold = $state(100);
	baseRequestDelay = $state(200);
	largeSubmissionDelayMultiplier = $state(2);
	enableProgressiveDelay = $state(true);
	maxDelayMultiplier = $state(4);
	enableIncrementalFetch = $state(true);
	incrementalFallbackToFull = $state(true);
	enableBatchProcessing = $state(false);
	batchSize = $state(5);
	batchDelaySeconds = $state(2);
	enableAutoBackoff = $state(true);
	autoBackoffBaseSeconds = $state(10);
	autoBackoffMaxMultiplier = $state(5);
	sourceDelaySeconds = $state(2);
	submissionSourceDelaySeconds = $state(5);
	enableDynamicApiDelay = $state(true);
	dynamicApiDelayMultiplier = $state(1.5);
	enableLargeSourceDownloadLimit = $state(true);
	largeSourceDownloadThreshold = $state(1000);
	largeSourceDownloadPageThreshold = $state(1000);
	largeSourceMaxVideosPerRound = $state(0);
	largeSourceMaxPagesPerRound = $state(2000);
	largeSourceConcurrentVideo = $state(1);
	largeSourceConcurrentPage = $state(1);
	largeSourcePlayurlLimit = $state(1);
	largeSourcePlayurlDurationMs = $state(1000);
	audioOnlyUseLowQnForPlayurl = $state(true);

	// aria2 监控
	enableAria2HealthCheck = $state(false);
	enableAria2AutoRestart = $state(false);
	aria2HealthCheckInterval = $state(300);

	saving = $state(false);

	// 并发提示用派生值
	effectiveDownloadThreads = $derived(normalizeConcurrencyValue(this.parallelDownloadThreads, 4));
	effectiveMaxFileConnections = $derived(this.effectiveDownloadThreads);
	effectiveConcurrentVideo = $derived(normalizeConcurrencyValue(this.concurrentVideo, 3));
	effectiveConcurrentPage = $derived(normalizeConcurrencyValue(this.concurrentPage, 2));
	estimatedMaxConnections = $derived(
		this.effectiveMaxFileConnections * this.effectiveConcurrentVideo * this.effectiveConcurrentPage
	);

	bindAddressError = $derived(validateBindAddressValue(this.bindAddress));
	bindAddressValid = $derived(this.bindAddressError === '');

	#ctx: MainConfigContext;
	#loadedBindAddress: string = DEFAULT_CONFIG_VALUES.bindAddress;

	constructor(ctx: MainConfigContext) {
		this.#ctx = ctx;
	}

	/** 用配置接口的返回值填充主配置表单 */
	applyFromConfig(config: ConfigResponse): void {
		this.interval = config.interval || DEFAULT_CONFIG_VALUES.interval;
		this.bindAddress = config.bind_address || DEFAULT_CONFIG_VALUES.bindAddress;
		this.parallelDownloadEnabled = config.parallel_download_enabled || false;
		this.parallelDownloadThreads =
			config.parallel_download_threads || DEFAULT_CONFIG_VALUES.parallelDownloadThreads;
		this.parallelDownloadUseAria2 = config.parallel_download_use_aria2 ?? false;

		this.videoMaxQuality = config.video_max_quality || 'Quality8k';
		this.videoMinQuality = config.video_min_quality || 'Quality360p';
		this.audioMaxQuality = config.audio_max_quality || 'QualityHiRES';
		this.audioMinQuality = config.audio_min_quality || 'Quality64k';
		this.codecs = config.codecs || [...DEFAULT_CONFIG_VALUES.codecs];
		this.noDolbyVideo = config.no_dolby_video || false;
		this.noDolbyAudio = config.no_dolby_audio || false;
		this.noHdr = config.no_hdr || false;
		this.noHires = config.no_hires || false;

		this.danmakuDuration = config.danmaku_duration || DEFAULT_CONFIG_VALUES.danmakuDuration;
		this.danmakuFont = config.danmaku_font || '黑体';
		this.danmakuFontSize = config.danmaku_font_size || DEFAULT_CONFIG_VALUES.danmakuFontSize;
		this.danmakuWidthRatio = config.danmaku_width_ratio || DEFAULT_CONFIG_VALUES.danmakuWidthRatio;
		this.danmakuHorizontalGap =
			config.danmaku_horizontal_gap || DEFAULT_CONFIG_VALUES.danmakuHorizontalGap;
		this.danmakuLaneSize = config.danmaku_lane_size || DEFAULT_CONFIG_VALUES.danmakuLaneSize;
		this.danmakuFloatPercentage =
			config.danmaku_float_percentage || DEFAULT_CONFIG_VALUES.danmakuFloatPercentage;
		this.danmakuBottomPercentage =
			config.danmaku_bottom_percentage || DEFAULT_CONFIG_VALUES.danmakuBottomPercentage;
		this.danmakuOpacity = config.danmaku_opacity || DEFAULT_CONFIG_VALUES.danmakuOpacity;
		this.danmakuBold = config.danmaku_bold !== undefined ? config.danmaku_bold : true;
		this.danmakuOutline = config.danmaku_outline || DEFAULT_CONFIG_VALUES.danmakuOutline;
		this.danmakuTimeOffset = config.danmaku_time_offset || DEFAULT_CONFIG_VALUES.danmakuTimeOffset;
		this.danmakuUpdateEnabled = config.danmaku_update_enabled ?? false;
		this.danmakuUpdateFreshDays =
			config.danmaku_update_fresh_days ?? DEFAULT_CONFIG_VALUES.danmakuUpdateFreshDays;
		this.danmakuUpdateFreshIntervalHours =
			config.danmaku_update_fresh_interval_hours ??
			DEFAULT_CONFIG_VALUES.danmakuUpdateFreshIntervalHours;
		this.danmakuUpdateMatureDays =
			config.danmaku_update_mature_days ?? DEFAULT_CONFIG_VALUES.danmakuUpdateMatureDays;
		this.danmakuUpdateMatureIntervalDays =
			config.danmaku_update_mature_interval_days ??
			DEFAULT_CONFIG_VALUES.danmakuUpdateMatureIntervalDays;
		this.danmakuUpdateColdDays =
			config.danmaku_update_cold_days ?? DEFAULT_CONFIG_VALUES.danmakuUpdateColdDays;
		this.danmakuUpdateColdIntervalDays =
			config.danmaku_update_cold_interval_days ??
			DEFAULT_CONFIG_VALUES.danmakuUpdateColdIntervalDays;

		this.concurrentVideo = config.concurrent_video || DEFAULT_CONFIG_VALUES.concurrentVideo;
		this.concurrentPage = config.concurrent_page || DEFAULT_CONFIG_VALUES.concurrentPage;
		this.rateLimit = config.rate_limit || DEFAULT_CONFIG_VALUES.rateLimit;
		this.rateDuration = config.rate_duration || DEFAULT_CONFIG_VALUES.rateDuration;

		this.cdnSorting = config.cdn_sorting || false;
		this.scanDeletedVideos = config.scan_deleted_videos || false;
		this.upperPath = config.upper_path || '';
		this.favoriteQuickSubscribePath = config.favorite_quick_subscribe_path || '';
		this.collectionQuickSubscribePath = config.collection_quick_subscribe_path || '';
		this.submissionQuickSubscribePath = config.submission_quick_subscribe_path || '';
		this.bangumiQuickSubscribePath = config.bangumi_quick_subscribe_path || '';
		this.pugvQuickSubscribePath = config.pugv_quick_subscribe_path || '';
		this.ffmpegPath = config.ffmpeg_path || '';

		this.largeSubmissionThreshold =
			config.large_submission_threshold || DEFAULT_CONFIG_VALUES.largeSubmissionThreshold;
		this.baseRequestDelay = config.base_request_delay || DEFAULT_CONFIG_VALUES.baseRequestDelay;
		this.largeSubmissionDelayMultiplier =
			config.large_submission_delay_multiplier ||
			DEFAULT_CONFIG_VALUES.largeSubmissionDelayMultiplier;
		this.enableProgressiveDelay = config.enable_progressive_delay ?? true;
		this.maxDelayMultiplier =
			config.max_delay_multiplier || DEFAULT_CONFIG_VALUES.maxDelayMultiplier;
		this.enableIncrementalFetch = config.enable_incremental_fetch ?? true;
		this.incrementalFallbackToFull = config.incremental_fallback_to_full ?? true;
		this.enableBatchProcessing = config.enable_batch_processing || false;
		this.batchSize = config.batch_size || DEFAULT_CONFIG_VALUES.batchSize;
		this.batchDelaySeconds = config.batch_delay_seconds || DEFAULT_CONFIG_VALUES.batchDelaySeconds;
		this.enableAutoBackoff = config.enable_auto_backoff ?? true;
		this.autoBackoffBaseSeconds =
			config.auto_backoff_base_seconds || DEFAULT_CONFIG_VALUES.autoBackoffBaseSeconds;
		this.autoBackoffMaxMultiplier =
			config.auto_backoff_max_multiplier || DEFAULT_CONFIG_VALUES.autoBackoffMaxMultiplier;
		this.sourceDelaySeconds =
			config.source_delay_seconds ?? DEFAULT_CONFIG_VALUES.sourceDelaySeconds;
		this.submissionSourceDelaySeconds =
			config.submission_source_delay_seconds ?? DEFAULT_CONFIG_VALUES.submissionSourceDelaySeconds;
		this.enableDynamicApiDelay = config.enable_dynamic_api_delay ?? true;
		this.dynamicApiDelayMultiplier =
			config.dynamic_api_delay_multiplier ?? DEFAULT_CONFIG_VALUES.dynamicApiDelayMultiplier;
		this.enableLargeSourceDownloadLimit = config.enable_large_source_download_limit ?? true;
		this.largeSourceDownloadThreshold =
			config.large_source_download_threshold ?? DEFAULT_CONFIG_VALUES.largeSourceDownloadThreshold;
		this.largeSourceDownloadPageThreshold =
			config.large_source_download_page_threshold ??
			DEFAULT_CONFIG_VALUES.largeSourceDownloadPageThreshold;
		this.largeSourceMaxVideosPerRound =
			config.large_source_max_videos_per_round ??
			DEFAULT_CONFIG_VALUES.largeSourceMaxVideosPerRound;
		this.largeSourceMaxPagesPerRound =
			config.large_source_max_pages_per_round ?? DEFAULT_CONFIG_VALUES.largeSourceMaxPagesPerRound;
		this.largeSourceConcurrentVideo =
			config.large_source_concurrent_video ?? DEFAULT_CONFIG_VALUES.largeSourceConcurrentVideo;
		this.largeSourceConcurrentPage =
			config.large_source_concurrent_page ?? DEFAULT_CONFIG_VALUES.largeSourceConcurrentPage;
		this.largeSourcePlayurlLimit =
			config.large_source_playurl_limit ?? DEFAULT_CONFIG_VALUES.largeSourcePlayurlLimit;
		this.largeSourcePlayurlDurationMs =
			config.large_source_playurl_duration_ms ?? DEFAULT_CONFIG_VALUES.largeSourcePlayurlDurationMs;
		this.audioOnlyUseLowQnForPlayurl = config.audio_only_use_low_qn_for_playurl ?? true;

		this.enableAria2HealthCheck = config.enable_aria2_health_check ?? false;
		this.enableAria2AutoRestart = config.enable_aria2_auto_restart ?? false;
		this.aria2HealthCheckInterval =
			config.aria2_health_check_interval ?? DEFAULT_CONFIG_VALUES.aria2HealthCheckInterval;

		this.#loadedBindAddress = config.bind_address ?? DEFAULT_CONFIG_VALUES.bindAddress;
	}

	/** 主配置字段载荷（命名与风控字段由各自 store 提供） */
	toPayload() {
		return {
			interval: normalizeNumberInput(this.interval, DEFAULT_CONFIG_VALUES.interval),
			bind_address: this.bindAddress,
			parallel_download_enabled: this.parallelDownloadEnabled,
			parallel_download_threads: normalizeNumberInput(
				this.parallelDownloadThreads,
				DEFAULT_CONFIG_VALUES.parallelDownloadThreads
			),
			parallel_download_use_aria2: this.parallelDownloadUseAria2,
			video_max_quality: this.videoMaxQuality,
			video_min_quality: this.videoMinQuality,
			audio_max_quality: this.audioMaxQuality,
			audio_min_quality: this.audioMinQuality,
			codecs: this.codecs.length > 0 ? this.codecs : [...DEFAULT_CONFIG_VALUES.codecs],
			no_dolby_video: this.noDolbyVideo,
			no_dolby_audio: this.noDolbyAudio,
			no_hdr: this.noHdr,
			no_hires: this.noHires,
			danmaku_duration: normalizeNumberInput(
				this.danmakuDuration,
				DEFAULT_CONFIG_VALUES.danmakuDuration
			),
			danmaku_font: this.danmakuFont,
			danmaku_font_size: normalizeNumberInput(
				this.danmakuFontSize,
				DEFAULT_CONFIG_VALUES.danmakuFontSize
			),
			danmaku_width_ratio: normalizeNumberInput(
				this.danmakuWidthRatio,
				DEFAULT_CONFIG_VALUES.danmakuWidthRatio
			),
			danmaku_horizontal_gap: normalizeNumberInput(
				this.danmakuHorizontalGap,
				DEFAULT_CONFIG_VALUES.danmakuHorizontalGap
			),
			danmaku_lane_size: normalizeNumberInput(
				this.danmakuLaneSize,
				DEFAULT_CONFIG_VALUES.danmakuLaneSize
			),
			danmaku_float_percentage: normalizeNumberInput(
				this.danmakuFloatPercentage,
				DEFAULT_CONFIG_VALUES.danmakuFloatPercentage
			),
			danmaku_bottom_percentage: normalizeNumberInput(
				this.danmakuBottomPercentage,
				DEFAULT_CONFIG_VALUES.danmakuBottomPercentage
			),
			danmaku_opacity: normalizeNumberInput(
				this.danmakuOpacity,
				DEFAULT_CONFIG_VALUES.danmakuOpacity
			),
			danmaku_bold: this.danmakuBold,
			danmaku_outline: normalizeNumberInput(
				this.danmakuOutline,
				DEFAULT_CONFIG_VALUES.danmakuOutline
			),
			danmaku_time_offset: normalizeNumberInput(
				this.danmakuTimeOffset,
				DEFAULT_CONFIG_VALUES.danmakuTimeOffset
			),
			danmaku_update_enabled: this.danmakuUpdateEnabled,
			danmaku_update_fresh_days: normalizeNumberInput(
				this.danmakuUpdateFreshDays,
				DEFAULT_CONFIG_VALUES.danmakuUpdateFreshDays
			),
			danmaku_update_fresh_interval_hours: normalizeNumberInput(
				this.danmakuUpdateFreshIntervalHours,
				DEFAULT_CONFIG_VALUES.danmakuUpdateFreshIntervalHours
			),
			danmaku_update_mature_days: normalizeNumberInput(
				this.danmakuUpdateMatureDays,
				DEFAULT_CONFIG_VALUES.danmakuUpdateMatureDays
			),
			danmaku_update_mature_interval_days: normalizeNumberInput(
				this.danmakuUpdateMatureIntervalDays,
				DEFAULT_CONFIG_VALUES.danmakuUpdateMatureIntervalDays
			),
			danmaku_update_cold_days: normalizeNumberInput(
				this.danmakuUpdateColdDays,
				DEFAULT_CONFIG_VALUES.danmakuUpdateColdDays
			),
			danmaku_update_cold_interval_days: normalizeNumberInput(
				this.danmakuUpdateColdIntervalDays,
				DEFAULT_CONFIG_VALUES.danmakuUpdateColdIntervalDays
			),
			concurrent_video: normalizeNumberInput(
				this.concurrentVideo,
				DEFAULT_CONFIG_VALUES.concurrentVideo
			),
			concurrent_page: normalizeNumberInput(
				this.concurrentPage,
				DEFAULT_CONFIG_VALUES.concurrentPage
			),
			rate_limit: normalizeNumberInput(this.rateLimit, DEFAULT_CONFIG_VALUES.rateLimit),
			rate_duration: normalizeNumberInput(this.rateDuration, DEFAULT_CONFIG_VALUES.rateDuration),
			cdn_sorting: this.cdnSorting,
			scan_deleted_videos: this.scanDeletedVideos,
			upper_path: this.upperPath,
			favorite_quick_subscribe_path: this.favoriteQuickSubscribePath,
			collection_quick_subscribe_path: this.collectionQuickSubscribePath,
			submission_quick_subscribe_path: this.submissionQuickSubscribePath,
			bangumi_quick_subscribe_path: this.bangumiQuickSubscribePath,
			pugv_quick_subscribe_path: this.pugvQuickSubscribePath,
			ffmpeg_path: this.ffmpegPath,
			large_submission_threshold: normalizeNumberInput(
				this.largeSubmissionThreshold,
				DEFAULT_CONFIG_VALUES.largeSubmissionThreshold
			),
			base_request_delay: normalizeNumberInput(
				this.baseRequestDelay,
				DEFAULT_CONFIG_VALUES.baseRequestDelay
			),
			large_submission_delay_multiplier: normalizeNumberInput(
				this.largeSubmissionDelayMultiplier,
				DEFAULT_CONFIG_VALUES.largeSubmissionDelayMultiplier
			),
			enable_progressive_delay: this.enableProgressiveDelay,
			max_delay_multiplier: normalizeNumberInput(
				this.maxDelayMultiplier,
				DEFAULT_CONFIG_VALUES.maxDelayMultiplier
			),
			enable_incremental_fetch: this.enableIncrementalFetch,
			incremental_fallback_to_full: this.incrementalFallbackToFull,
			enable_batch_processing: this.enableBatchProcessing,
			batch_size: normalizeNumberInput(this.batchSize, DEFAULT_CONFIG_VALUES.batchSize),
			batch_delay_seconds: normalizeNumberInput(
				this.batchDelaySeconds,
				DEFAULT_CONFIG_VALUES.batchDelaySeconds
			),
			enable_auto_backoff: this.enableAutoBackoff,
			auto_backoff_base_seconds: normalizeNumberInput(
				this.autoBackoffBaseSeconds,
				DEFAULT_CONFIG_VALUES.autoBackoffBaseSeconds
			),
			auto_backoff_max_multiplier: normalizeNumberInput(
				this.autoBackoffMaxMultiplier,
				DEFAULT_CONFIG_VALUES.autoBackoffMaxMultiplier
			),
			source_delay_seconds: normalizeNumberInput(
				this.sourceDelaySeconds,
				DEFAULT_CONFIG_VALUES.sourceDelaySeconds
			),
			submission_source_delay_seconds: normalizeNumberInput(
				this.submissionSourceDelaySeconds,
				DEFAULT_CONFIG_VALUES.submissionSourceDelaySeconds
			),
			enable_dynamic_api_delay: this.enableDynamicApiDelay,
			dynamic_api_delay_multiplier: normalizeNumberInput(
				this.dynamicApiDelayMultiplier,
				DEFAULT_CONFIG_VALUES.dynamicApiDelayMultiplier
			),
			enable_large_source_download_limit: this.enableLargeSourceDownloadLimit,
			large_source_download_threshold: normalizeNumberInput(
				this.largeSourceDownloadThreshold,
				DEFAULT_CONFIG_VALUES.largeSourceDownloadThreshold
			),
			large_source_download_page_threshold: normalizeNumberInput(
				this.largeSourceDownloadPageThreshold,
				DEFAULT_CONFIG_VALUES.largeSourceDownloadPageThreshold
			),
			large_source_max_videos_per_round: normalizeNumberInput(
				this.largeSourceMaxVideosPerRound,
				DEFAULT_CONFIG_VALUES.largeSourceMaxVideosPerRound
			),
			large_source_max_pages_per_round: normalizeNumberInput(
				this.largeSourceMaxPagesPerRound,
				DEFAULT_CONFIG_VALUES.largeSourceMaxPagesPerRound
			),
			large_source_concurrent_video: normalizeNumberInput(
				this.largeSourceConcurrentVideo,
				DEFAULT_CONFIG_VALUES.largeSourceConcurrentVideo
			),
			large_source_concurrent_page: normalizeNumberInput(
				this.largeSourceConcurrentPage,
				DEFAULT_CONFIG_VALUES.largeSourceConcurrentPage
			),
			large_source_playurl_limit: normalizeNumberInput(
				this.largeSourcePlayurlLimit,
				DEFAULT_CONFIG_VALUES.largeSourcePlayurlLimit
			),
			large_source_playurl_duration_ms: normalizeNumberInput(
				this.largeSourcePlayurlDurationMs,
				DEFAULT_CONFIG_VALUES.largeSourcePlayurlDurationMs
			),
			audio_only_use_low_qn_for_playurl: this.audioOnlyUseLowQnForPlayurl,
			enable_aria2_health_check: this.enableAria2HealthCheck,
			enable_aria2_auto_restart: this.enableAria2AutoRestart,
			aria2_health_check_interval: normalizeNumberInput(
				this.aria2HealthCheckInterval,
				DEFAULT_CONFIG_VALUES.aria2HealthCheckInterval
			)
		};
	}

	/** 保存主配置（合并命名与风控载荷） */
	async save(): Promise<void> {
		if (!this.#ctx.naming.validateAll()) {
			toast.error('配置验证失败', { description: this.#ctx.naming.firstValidationError });
			return;
		}

		if (!this.bindAddressValid) {
			toast.error('配置验证失败', { description: this.bindAddressError });
			return;
		}

		const params: UpdateConfigRequest = {
			...this.#ctx.naming.toPayload(),
			...this.toPayload(),
			...this.#ctx.captcha.toMainConfigPayload()
		};

		const response = await runRequest(() => api.updateConfig(params), {
			setLoading: (value) => (this.saving = value),
			context: '保存配置失败'
		});
		if (!response) return;

		if (response.data.success) {
			const trimmedBindAddress = this.bindAddress.trim();
			const nextBindAddress = trimmedBindAddress
				? trimmedBindAddress.includes(':')
					? trimmedBindAddress
					: `0.0.0.0:${trimmedBindAddress}`
				: DEFAULT_CONFIG_VALUES.bindAddress;

			if (nextBindAddress !== this.#loadedBindAddress) {
				toast.success('保存成功', {
					description: '端口配置已更新，请重启程序使配置生效',
					duration: 8000
				});
			} else {
				toast.success('保存成功', { description: response.data.message });
			}
			this.#ctx.closeSheet();
		} else {
			toast.error('保存失败', { description: response.data.message });
		}
	}
}
