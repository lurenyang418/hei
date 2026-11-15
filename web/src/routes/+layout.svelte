<script lang="ts">
	import '../app.css';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { breadcrumbStore } from '$lib/stores/breadcrumb';
	import BreadCrumb from '$lib/components/bread-crumb.svelte';
	import { videoSourceStore, setVideoSources } from '$lib/stores/video-source';
	import { onDestroy, onMount } from 'svelte';
	import api from '$lib/api';
	import { toast } from 'svelte-sonner';
	import type { ApiError, BetaImageUpdateStatusResponse } from '$lib/types';
	import { LogOut, BookOpen, ScrollText, RefreshCw } from '@lucide/svelte';
	import ResponsiveButton from '$lib/components/responsive-button.svelte';
	import { initTheme } from '$lib/stores/theme';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
	import InstallPrompt from '$lib/components/pwa/install-prompt.svelte';
	import { APP_VERSION } from '$lib/generated/app-version';
	import { formatTimestampOrFallback } from '$lib/utils/timezone';
	import { installGlossaryTooltips } from '$lib/utils/glossary-tooltip';

	let dataLoaded = false;
	let isAuthenticated = false;
	let betaImageUpdateStatus: BetaImageUpdateStatusResponse | null = null;
	let showVersionTooltip = false;
	let versionBadgeContainer: HTMLDivElement | null = null;
	let cleanupGlossaryTooltips: (() => void) | null = null;
	let sidebarWidth = '16rem';

	// 退出登录
	function handleLogout() {
		api.setAuthToken('');
		isAuthenticated = false;
		goto(resolve('/'));
		window.location.reload(); // 重新加载页面以清除状态
	}

	// 检查认证状态
	async function checkAuthStatus() {
		const token = localStorage.getItem('auth_token');
		if (token) {
			api.setAuthToken(token);
			try {
				// 验证token有效性
				await api.getVideoSources();
				isAuthenticated = true;
				checkBetaImageUpdateStatus();
				// 初始化视频源数据，所有组件都会用到
				if (!$videoSourceStore) {
					setVideoSources((await api.getVideoSources()).data);
				}
			} catch (error) {
				console.error('Token验证失败:', error);
				if ((error as ApiError).status === 401) {
					// Token 无效，清除
					isAuthenticated = false;
					api.setAuthToken('');
					localStorage.removeItem('auth_token');
				} else {
					// 只有在非401错误时才显示错误提示，避免新用户看到不必要的错误
					toast.error('加载视频来源失败', {
						description: (error as ApiError).message
					});
				}
			}
		} else {
			// 新用户没有token，这是正常情况，不需要显示错误
			isAuthenticated = false;
		}
		dataLoaded = true;
	}

	function getVersionBadgeTitle() {
		const base = `当前版本：${APP_VERSION}`;
		if (!betaImageUpdateStatus) {
			return base;
		}
		if (betaImageUpdateStatus.error) {
			return `${base}\n更新检查失败：${betaImageUpdateStatus.error}`;
		}

		function formatUpdateTime(ts?: string | null): string {
			return formatTimestampOrFallback(ts, 'Asia/Shanghai', 'datetime', ts ?? '未知').replaceAll(
				'/',
				'-'
			);
		}

		const channel = betaImageUpdateStatus.release_channel ?? '未知';
		const channelLabel =
			channel === 'stable'
				? '正式版'
				: channel === 'beta'
					? '测试版'
					: channel === 'dev'
						? '开发版'
						: channel;

		const local = formatUpdateTime(betaImageUpdateStatus.local_built_at);
		const remote = formatUpdateTime(betaImageUpdateStatus.remote_pushed_at);
		const tag = betaImageUpdateStatus.checked_tag ?? '未知';
		const hint = betaImageUpdateStatus.update_available
			? `发现${channelLabel}镜像更新`
			: `${channelLabel}镜像已是最新`;
		return `${base}\n渠道：${channelLabel}（${tag}）\n${hint}\n当前版本构建时间：${local}\n仓库推送时间：${remote}`;
	}

	async function checkBetaImageUpdateStatus() {
		if (!isAuthenticated) return;

		try {
			const result = await api.getBetaImageUpdateStatus();
			betaImageUpdateStatus = result.data;
		} catch {
			// 静默失败，避免影响主流程
		}
	}

	function toggleVersionTooltip() {
		showVersionTooltip = !showVersionTooltip;
	}

	function handleDocumentClick(event: MouseEvent) {
		if (!showVersionTooltip) return;
		const target = event.target;
		if (!(target instanceof Node)) return;
		if (versionBadgeContainer && versionBadgeContainer.contains(target)) return;
		showVersionTooltip = false;
	}

	// 自动更新模式下，新 Service Worker 接管后刷新一次。
	onMount(() => {
		if (!('serviceWorker' in navigator)) return;

		if (import.meta.env.DEV) {
			const isDevWorker = (worker: ServiceWorker | null) => {
				if (!worker) return false;
				const url = new URL(worker.scriptURL);
				return url.origin === window.location.origin && url.pathname === '/dev-sw.js';
			};
			void navigator.serviceWorker
				.getRegistrations()
				.then(async (registrations) => {
					const devRegistrations = registrations.filter((registration) =>
						[registration.active, registration.waiting, registration.installing].some(isDevWorker)
					);
					if (devRegistrations.length === 0) return;

					const wasControlled = isDevWorker(navigator.serviceWorker.controller);
					const removed = await Promise.all(
						devRegistrations.map((registration) => registration.unregister())
					);
					if ('caches' in window) {
						await Promise.all(['api-cache', 'images-cache'].map((name) => caches.delete(name)));
					}
					// 注销不会解除当前页面的控制；刷新后才会绕过旧 Worker。
					if (wasControlled && removed.some(Boolean)) window.location.reload();
				})
				.catch(() => {
					// 浏览器禁止访问 Service Worker 或缓存时继续加载页面。
				});
			return;
		}

		let hadController = Boolean(navigator.serviceWorker.controller);
		let refreshing = false;
		const handleControllerChange = () => {
			if (!navigator.serviceWorker.controller) return;
			if (hadController && !refreshing) {
				refreshing = true;
				window.location.reload();
			}
			hadController = true;
		};
		navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
		void navigator.serviceWorker.ready
			.then(async (registration) => {
				// 删除旧版本留下的运行时缓存，不清除前端资源预缓存。
				if ('caches' in window) {
					await Promise.all(['api-cache', 'images-cache'].map((name) => caches.delete(name)));
				}
				await registration.update();
			})
			.catch(() => {
				// 离线或更新检查失败时继续使用当前版本。
			});

		return () => {
			navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
		};
	});

	// 初始化共用数据
	onMount(async () => {
		// 初始化主题
		initTheme();
		// 恢复上次拖拽的侧边栏宽度
		const savedSidebarWidth = localStorage.getItem('sidebar-width');
		if (savedSidebarWidth && /^\d+(?:\.\d+)?(?:px|rem)$/.test(savedSidebarWidth)) {
			sidebarWidth = savedSidebarWidth;
		}
		cleanupGlossaryTooltips = installGlossaryTooltips(document);
		await checkAuthStatus();
		// 监听登录成功事件
		window.addEventListener('login-success', () => {
			isAuthenticated = true;
			checkAuthStatus();
		});
	});

	onMount(() => {
		document.addEventListener('click', handleDocumentClick);
	});

	onDestroy(() => {
		document.removeEventListener('click', handleDocumentClick);
		cleanupGlossaryTooltips?.();
		cleanupGlossaryTooltips = null;
	});
</script>

<Toaster />
<InstallPrompt />

<Sidebar.Provider style="--sidebar-width: {sidebarWidth}">
	<div class="prevent-horizontal-scroll flex h-screen w-full overflow-hidden">
		{#if isAuthenticated}
			<div data-sidebar="sidebar">
				<AppSidebar onResize={(width) => (sidebarWidth = `${width}px`)} />
			</div>
		{/if}
		<Sidebar.Inset class="flex h-screen flex-1 flex-col overflow-hidden">
			{#if isAuthenticated}
				<div
					class="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 flex min-h-[73px] w-full items-center border-b backdrop-blur"
				>
					<div class="flex w-full items-center gap-2 px-4 py-2 sm:gap-4 sm:px-6">
						<Sidebar.Trigger class="shrink-0" data-sidebar="trigger" />
						<div class="min-w-0 flex-1">
							<!-- 保留空间保持布局一致性 -->
						</div>
						<div class="flex items-center gap-1 sm:gap-2">
							<ThemeToggle />
							{#if betaImageUpdateStatus?.update_available}
								<div class="relative" bind:this={versionBadgeContainer}>
									<button
										type="button"
										class="border-border bg-background hover:bg-accent relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border"
										title={getVersionBadgeTitle()}
										aria-label="发现新版本"
										onclick={toggleVersionTooltip}
										onkeydown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												toggleVersionTooltip();
											} else if (e.key === 'Escape') {
												showVersionTooltip = false;
											}
										}}
									>
										<RefreshCw class="h-4 w-4" />
										{#if betaImageUpdateStatus?.release_channel}
											<span
												class="border-border bg-background text-muted-foreground pointer-events-none absolute -right-1 -bottom-1 rounded border px-1 text-[10px] leading-[14px]"
											>
												{betaImageUpdateStatus.release_channel === 'stable'
													? '正'
													: betaImageUpdateStatus.release_channel === 'beta'
														? '测'
														: betaImageUpdateStatus.release_channel === 'dev'
															? '开'
															: betaImageUpdateStatus.release_channel}
											</span>
										{/if}
										<span
											class="bg-destructive border-background absolute -top-1 -right-1 h-2 w-2 rounded-full border-2"
											aria-label="发现更新"
										></span>
									</button>
									{#if showVersionTooltip}
										<div
											class="border-border bg-background fixed inset-x-4 top-[80px] z-50 max-h-[calc(100vh-100px)] overflow-auto rounded-lg border p-3 text-xs shadow-xl sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:left-auto sm:mt-2 sm:max-h-[70vh] sm:w-[min(360px,calc(100vw-2rem))]"
										>
											<div class="leading-relaxed whitespace-pre-wrap">
												{getVersionBadgeTitle()}
											</div>
										</div>
									{/if}
								</div>
							{/if}
							<ResponsiveButton
								size="sm"
								variant="outline"
								onclick={() => goto(resolve('/changelog'))}
								icon={ScrollText}
								title="查看更新记录"
							/>
							<ResponsiveButton
								size="sm"
								variant="outline"
								onclick={() => window.open('https://lurenyang418.github.io/hei/', '_blank')}
								icon={BookOpen}
								title="查看文档"
							/>
							<ResponsiveButton
								size="sm"
								variant="outline"
								onclick={handleLogout}
								icon={LogOut}
								title="退出"
							/>
						</div>
					</div>
				</div>
			{/if}
			<div class="bg-background smooth-scroll flex-1 overflow-auto">
				<div class="w-full px-4 py-4 sm:px-6 sm:py-6">
					{#if isAuthenticated && $breadcrumbStore.length > 0}
						<div class="mb-6">
							<BreadCrumb items={$breadcrumbStore} />
						</div>
					{/if}
					{#if dataLoaded}
						<slot />
					{/if}
				</div>
			</div>
		</Sidebar.Inset>
	</div>
</Sidebar.Provider>
